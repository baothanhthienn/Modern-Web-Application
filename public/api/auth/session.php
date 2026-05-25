<?php
require_once dirname(__FILE__) . '/bootstrap.php';

$db = database();
$user = authenticated_user($db);
if (!$user) {
    auth_log('Session check rejected: no valid database session.');
    respond(401, array('success' => false, 'error' => 'Session expired or invalid.'));
}

auth_log('Session restored for user_id=' . $user['id']);
respond(200, array('success' => true, 'user' => public_user($user)));
