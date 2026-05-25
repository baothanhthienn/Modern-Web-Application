<?php
require_once dirname(__FILE__) . '/bootstrap.php';

auth_log('Logout requested.');
$db = database();
revoke_session($db);
auth_log('Logout completed.');
respond(200, array('success' => true));
