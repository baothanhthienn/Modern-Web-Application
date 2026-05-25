<?php
/*
 * Set these values before running npm run build for a Mercury upload.
 * This PHP file executes on Mercury; it is not included in the Vue JavaScript bundle.
 * Do not commit a real database password to a public repository.
 */
return array(
    'host' => 'feenix-mariadb.swin.edu.au',
    'port' => '3306',
    'database' => 's105292789_db',
    'username' => 's105292789',
    'password' => '120806',
    // Keep true while diagnosing the connection, then set false before submission.
    'debug' => true
);
