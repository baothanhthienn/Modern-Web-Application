<?php
require_once dirname(__FILE__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, array('success' => false, 'error' => 'POST required.'));
}

$data = request_data();
$identifier = trim(isset($data['identifier']) ? $data['identifier'] : '');
$password = isset($data['password']) ? (string) $data['password'] : '';
if ($identifier === '' || $password === '') {
    respond(400, array('success' => false, 'error' => 'Enter your username or email and password.'));
}

$statement = database()->prepare('SELECT id, username, email, password_hash, created_at FROM users WHERE username = ? OR email = ? LIMIT 1');
$statement->execute(array($identifier, strtolower($identifier)));
$user = $statement->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_matches($password, $user['password_hash'])) {
    respond(401, array('success' => false, 'error' => 'Invalid username, email, or password.'));
}

$_SESSION['user_id'] = (int) $user['id'];
respond(200, array('success' => true, 'user' => public_user($user)));
