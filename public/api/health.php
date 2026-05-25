<?php
require_once dirname(__FILE__) . '/auth/bootstrap.php';

auth_log('Database health check requested.');
$database = database();
$result = $database->query('SELECT DATABASE() AS database_name, VERSION() AS version');
$row = $result->fetch(PDO::FETCH_ASSOC);

auth_log('Database health check successful.');
respond(200, array(
    'success' => true,
    'database' => 'connected',
    'databaseName' => $row['database_name'],
    'serverVersion' => $row['version']
));
