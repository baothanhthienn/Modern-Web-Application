<?php
require_once dirname(__FILE__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, array('success' => false, 'error' => 'POST required.'));
}

$data = request_data();
$email = strtolower(trim(isset($data['email']) ? $data['email'] : ''));
$username = trim(isset($data['username']) ? $data['username'] : '');
$password = isset($data['password']) ? (string) $data['password'] : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 191) {
    respond(400, array('success' => false, 'error' => 'Enter a valid email address.'));
}
if (!preg_match('/^[A-Za-z0-9_]{3,20}$/', $username)) {
    respond(400, array('success' => false, 'error' => 'Username must be 3-20 letters, numbers, or underscores.'));
}
if (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password)) {
    respond(400, array('success' => false, 'error' => 'Password must be 8+ characters with uppercase, lowercase, and a number.'));
}

auth_log('Registration attempt for username=' . $username . ' email=' . $email);
$db = database();
$existing = $db->prepare('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1');
$existing->execute(array($username, $email));
if ($existing->fetch()) {
    auth_log('Registration rejected because account already exists for username=' . $username);
    respond(409, array('success' => false, 'error' => 'That username or email is already registered.'));
}

$createdAt = round(microtime(true) * 1000);
$insert = $db->prepare('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)');
$insert->execute(array($username, $email, new_password_hash($password), $createdAt));

$user = array('id' => $db->lastInsertId(), 'username' => $username, 'email' => $email, 'created_at' => $createdAt);
issue_session($db, $user['id']);
auth_log('Registration successful for user_id=' . $user['id']);
respond(201, array('success' => true, 'user' => public_user($user)));
