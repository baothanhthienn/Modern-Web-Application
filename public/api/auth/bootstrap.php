<?php
header('Content-Type: application/json; charset=utf-8');

define('AUTH_COOKIE_NAME', 'reddit_session');
define('AUTH_SESSION_SECONDS', 2592000);

function auth_log($message)
{
    error_log('[reddit auth] ' . $message);
}

function respond($status, $payload)
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function request_data()
{
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : array();
}

function database()
{
    $config = include dirname(__FILE__) . '/../config.php';
    $debug = isset($config['debug']) && $config['debug'];
    $dsn = 'mysql:host=' . $config['host']
        . ';port=' . $config['port']
        . ';dbname=' . $config['database']
        . ';charset=utf8mb4';

    auth_log('Connecting to host=' . $config['host'] . ' database=' . $config['database'] . ' user=' . $config['username']);

    try {
        $db = new PDO($dsn, $config['username'], $config['password']);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        auth_log('Database connection successful.');
        return $db;
    } catch (PDOException $error) {
        auth_log('Database connection failed: ' . $error->getMessage());
        $payload = array('success' => false, 'error' => 'Database connection failed.');
        if ($debug) {
            $payload['details'] = $error->getMessage();
        }
        respond(500, $payload);
    }
}

function request_session_token()
{
    return isset($_COOKIE[AUTH_COOKIE_NAME]) ? $_COOKIE[AUTH_COOKIE_NAME] : null;
}

function secure_cookie()
{
    return isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off';
}

function issue_session($db, $userId)
{
    $token = bin2hex(openssl_random_pseudo_bytes(32));
    $now = round(microtime(true) * 1000);
    $expiresAt = $now + (AUTH_SESSION_SECONDS * 1000);
    $statement = $db->prepare('INSERT INTO auth_sessions (user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)');
    $statement->execute(array((int) $userId, hash('sha256', $token), $now, $expiresAt));
    setcookie(AUTH_COOKIE_NAME, $token, time() + AUTH_SESSION_SECONDS, '/', '', secure_cookie(), true);
    auth_log('Database session issued for user_id=' . $userId);
}

function authenticated_user($db)
{
    $token = request_session_token();
    if (!$token) {
        return null;
    }

    $statement = $db->prepare(
        'SELECT u.id, u.username, u.email, u.created_at
         FROM auth_sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?
         LIMIT 1'
    );
    $statement->execute(array(hash('sha256', $token), round(microtime(true) * 1000)));
    return $statement->fetch(PDO::FETCH_ASSOC);
}

function revoke_session($db)
{
    $token = request_session_token();
    if ($token) {
        $statement = $db->prepare('DELETE FROM auth_sessions WHERE token_hash = ?');
        $statement->execute(array(hash('sha256', $token)));
    }
    setcookie(AUTH_COOKIE_NAME, '', time() - 3600, '/', '', secure_cookie(), true);
}

function public_user($user)
{
    return array(
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'joinDate' => date(DATE_ATOM, (int) floor(((float) $user['created_at']) / 1000))
    );
}

function new_password_hash($password)
{
    $bytes = openssl_random_pseudo_bytes(16);
    $salt = substr(str_replace('+', '.', base64_encode($bytes)), 0, 22);
    return crypt($password, '$2y$10$' . $salt . '$');
}

function password_matches($password, $hash)
{
    return hash_equals_compat($hash, crypt($password, $hash));
}

function hash_equals_compat($known, $given)
{
    if (strlen($known) !== strlen($given)) {
        return false;
    }

    $difference = 0;
    for ($index = 0; $index < strlen($known); $index++) {
        $difference |= ord($known[$index]) ^ ord($given[$index]);
    }
    return $difference === 0;
}
