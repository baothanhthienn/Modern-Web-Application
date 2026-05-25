<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

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
    $dsn = 'mysql:host=' . $config['host']
        . ';port=' . $config['port']
        . ';dbname=' . $config['database']
        . ';charset=utf8mb4';

    try {
        $db = new PDO($dsn, $config['username'], $config['password']);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $db;
    } catch (PDOException $error) {
        respond(500, array('success' => false, 'error' => 'Database connection failed.'));
    }
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
