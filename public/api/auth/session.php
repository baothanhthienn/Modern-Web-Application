<?php
require_once dirname(__FILE__) . '/bootstrap.php';

if (!isset($_SESSION['user_id'])) {
    respond(401, array('success' => false, 'error' => 'Session expired or invalid.'));
}

$statement = database()->prepare('SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1');
$statement->execute(array((int) $_SESSION['user_id']));
$user = $statement->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    session_destroy();
    respond(401, array('success' => false, 'error' => 'Session expired or invalid.'));
}

respond(200, array('success' => true, 'user' => public_user($user)));
