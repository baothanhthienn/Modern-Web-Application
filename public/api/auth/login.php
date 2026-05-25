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

auth_log('Login attempt for identifier=' . $identifier);
$db = database();
$statement = $db->prepare('SELECT id, username, email, password_hash, created_at FROM users WHERE username = ? OR email = ? LIMIT 1');
$statement->execute(array($identifier, strtolower($identifier)));
$user = $statement->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_matches($password, $user['password_hash'])) {
    auth_log('Login rejected for identifier=' . $identifier);
    respond(401, array('success' => false, 'error' => 'Invalid username, email, or password.'));
}

issue_session($db, $user['id']);
auth_log('Login successful for user_id=' . $user['id']);
respond(200, array('success' => true, 'user' => public_user($user)));
