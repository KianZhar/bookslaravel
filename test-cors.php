<?php
/**
 * CORS Diagnostic Tester
 * 
 * Access this file at: https://ccs4thyear.com/Books/Kian_Laravel/public/test-cors.php
 * Or: https://ccs4thyear.com/Books/Kian_Laravel/test-cors.php (if root .htaccess redirects)
 * 
 * This file helps diagnose CORS issues by testing:
 * 1. If the backend is accessible
 * 2. If CORS headers are being sent
 * 3. If OPTIONS preflight requests work
 * 4. What the actual API responses are
 */

header('Content-Type: text/html; charset=utf-8');

// Get the origin from request
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://kianzhar.github.io';
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$requestUri = $_SERVER['REQUEST_URI'] ?? '';

// Handle OPTIONS preflight
if ($requestMethod === 'OPTIONS') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, Accept, Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit('OPTIONS preflight handled');
}

// Add CORS headers to this test page response
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, Accept, Origin');
header('Access-Control-Allow-Credentials: true');

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CORS Diagnostic Tester</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #16213e;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        h1 {
            color: #4ecdc4;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #aaa;
            margin-bottom: 30px;
        }
        .section {
            background: #0f3460;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #4ecdc4;
        }
        .section h2 {
            color: #4ecdc4;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .test-item {
            background: #1a1a2e;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
        }
        .test-item label {
            display: block;
            font-weight: 600;
            color: #4ecdc4;
            margin-bottom: 8px;
        }
        .test-item .value {
            font-family: 'Courier New', monospace;
            color: #fff;
            word-break: break-all;
            background: #0a0a0a;
            padding: 10px;
            border-radius: 4px;
            margin-top: 5px;
        }
        .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        .status.success { background: #28a745; color: white; }
        .status.error { background: #dc3545; color: white; }
        .status.warning { background: #ffc107; color: #000; }
        button {
            background: #4ecdc4;
            color: #1a1a2e;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 10px;
            transition: background 0.3s;
        }
        button:hover { background: #45b8b0; }
        .response-box {
            background: #0a0a0a;
            padding: 15px;
            border-radius: 6px;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .headers-list {
            list-style: none;
            padding: 0;
        }
        .headers-list li {
            padding: 5px 0;
            border-bottom: 1px solid #333;
        }
        .headers-list .header-name {
            color: #4ecdc4;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 CORS Diagnostic Tester</h1>
        <p class="subtitle">Testing CORS configuration for Kian Laravel Backend</p>

        <!-- Server Information -->
        <div class="section">
            <h2>1. Server Information</h2>
            <div class="test-item">
                <label>Request Method</label>
                <div class="value"><?php echo htmlspecialchars($requestMethod); ?></div>
            </div>
            <div class="test-item">
                <label>Request URI</label>
                <div class="value"><?php echo htmlspecialchars($requestUri); ?></div>
            </div>
            <div class="test-item">
                <label>Origin (from request)</label>
                <div class="value"><?php echo htmlspecialchars($origin); ?></div>
            </div>
            <div class="test-item">
                <label>PHP Version</label>
                <div class="value"><?php echo PHP_VERSION; ?></div>
            </div>
            <div class="test-item">
                <label>Server Software</label>
                <div class="value"><?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?></div>
            </div>
        </div>

        <!-- CORS Headers Check -->
        <div class="section">
            <h2>2. CORS Headers in This Response</h2>
            <div class="test-item">
                <label>Response Headers Sent</label>
                <div class="value">
                    <?php
                    $headers = headers_list();
                    $corsHeaders = [];
                    foreach ($headers as $header) {
                        if (stripos($header, 'access-control') !== false) {
                            $corsHeaders[] = $header;
                        }
                    }
                    if (empty($corsHeaders)) {
                        echo '<span class="status error">❌ No CORS headers found!</span>';
                    } else {
                        echo '<span class="status success">✅ CORS headers present:</span><br><br>';
                        echo '<ul class="headers-list">';
                        foreach ($corsHeaders as $header) {
                            echo '<li><span class="header-name">' . htmlspecialchars($header) . '</span></li>';
                        }
                        echo '</ul>';
                    }
                    ?>
                </div>
            </div>
        </div>

        <!-- Laravel Check -->
        <div class="section">
            <h2>3. Laravel Configuration Check</h2>
            <div class="test-item">
                <label>Laravel Bootstrap Path</label>
                <div class="value">
                    <?php
                    $bootstrapPath = __DIR__ . '/../bootstrap/app.php';
                    if (file_exists($bootstrapPath)) {
                        echo '<span class="status success">✅ Found: ' . htmlspecialchars($bootstrapPath) . '</span>';
                    } else {
                        echo '<span class="status error">❌ Not found: ' . htmlspecialchars($bootstrapPath) . '</span>';
                    }
                    ?>
                </div>
            </div>
            <div class="test-item">
                <label>CORS Config Path</label>
                <div class="value">
                    <?php
                    $corsConfigPath = __DIR__ . '/../config/cors.php';
                    if (file_exists($corsConfigPath)) {
                        echo '<span class="status success">✅ Found: ' . htmlspecialchars($corsConfigPath) . '</span>';
                        $corsConfig = include $corsConfigPath;
                        if (isset($corsConfig['allowed_origins'])) {
                            $allowedOrigins = $corsConfig['allowed_origins'];
                            if (in_array('https://kianzhar.github.io', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
                                echo '<br><span class="status success">✅ Origin "' . htmlspecialchars($origin) . '" is in allowed_origins</span>';
                            } else {
                                echo '<br><span class="status error">❌ Origin "' . htmlspecialchars($origin) . '" NOT in allowed_origins</span>';
                                echo '<br>Allowed origins: ' . implode(', ', array_slice($allowedOrigins, 0, 5)) . '...';
                            }
                        }
                    } else {
                        echo '<span class="status error">❌ Not found: ' . htmlspecialchars($corsConfigPath) . '</span>';
                    }
                    ?>
                </div>
            </div>
            <div class="test-item">
                <label>CORS Middleware Path</label>
                <div class="value">
                    <?php
                    $middlewarePath = __DIR__ . '/../app/Http/Middleware/CorsMiddleware.php';
                    if (file_exists($middlewarePath)) {
                        echo '<span class="status success">✅ Found: ' . htmlspecialchars($middlewarePath) . '</span>';
                    } else {
                        echo '<span class="status error">❌ Not found: ' . htmlspecialchars($middlewarePath) . '</span>';
                        echo '<br><span style="color: #ffc107;">⚠️ Custom CORS middleware not found. Using Laravel default.</span>';
                    }
                    ?>
                </div>
            </div>
        </div>

        <!-- API Test -->
        <div class="section">
            <h2>4. API Endpoint Test</h2>
            <div class="test-item">
                <label>Test API Endpoint</label>
                <button onclick="testAPI()">Test /api/auth/login (OPTIONS)</button>
                <button onclick="testAPIGET()">Test /api/books (GET)</button>
                <div id="api-response" class="response-box" style="display:none;"></div>
            </div>
        </div>

        <!-- Manual Test Instructions -->
        <div class="section">
            <h2>5. Manual Test Instructions</h2>
            <div class="test-item">
                <label>Browser Console Test</label>
                <div class="value">
                    Open browser console (F12) and run:<br><br>
                    <code style="background: #0a0a0a; padding: 10px; display: block; border-radius: 4px;">
// Test OPTIONS preflight<br>
fetch('https://ccs4thyear.com/Books/Kian_Laravel/api/auth/login', {<br>
&nbsp;&nbsp;method: 'OPTIONS',<br>
&nbsp;&nbsp;headers: {<br>
&nbsp;&nbsp;&nbsp;&nbsp;'Origin': 'https://kianzhar.github.io',<br>
&nbsp;&nbsp;&nbsp;&nbsp;'Access-Control-Request-Method': 'POST'<br>
&nbsp;&nbsp;}<br>
}).then(r => {<br>
&nbsp;&nbsp;console.log('Status:', r.status);<br>
&nbsp;&nbsp;console.log('CORS Headers:', {<br>
&nbsp;&nbsp;&nbsp;&nbsp;'Allow-Origin': r.headers.get('access-control-allow-origin'),<br>
&nbsp;&nbsp;&nbsp;&nbsp;'Allow-Methods': r.headers.get('access-control-allow-methods')<br>
&nbsp;&nbsp;});<br>
});
                    </code>
                </div>
            </div>
        </div>

        <!-- Recommendations -->
        <div class="section">
            <h2>6. Recommendations</h2>
            <div class="test-item">
                <div class="value">
                    <ul style="list-style: none; padding: 0;">
                        <li style="padding: 8px 0; border-bottom: 1px solid #333;">
                            <strong>1. Clear Laravel Cache:</strong><br>
                            <code>php artisan config:clear && php artisan cache:clear</code>
                        </li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #333;">
                            <strong>2. Verify .htaccess:</strong><br>
                            Check that <code>public/.htaccess</code> handles OPTIONS requests
                        </li>
                        <li style="padding: 8px 0; border-bottom: 1px solid #333;">
                            <strong>3. Check Middleware:</strong><br>
                            Verify <code>bootstrap/app.php</code> has CORS middleware registered
                        </li>
                        <li style="padding: 8px 0;">
                            <strong>4. Test Direct Access:</strong><br>
                            Try: <code>https://ccs4thyear.com/Books/Kian_Laravel/api/books</code>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function testAPI() {
            const responseEl = document.getElementById('api-response');
            responseEl.style.display = 'block';
            responseEl.textContent = 'Testing OPTIONS request...\n\n';

            try {
                const response = await fetch('https://ccs4thyear.com/Books/Kian_Laravel/api/auth/login', {
                    method: 'OPTIONS',
                    headers: {
                        'Origin': 'https://kianzhar.github.io',
                        'Access-Control-Request-Method': 'POST',
                        'Access-Control-Request-Headers': 'content-type'
                    }
                });

                const headers = {};
                response.headers.forEach((value, key) => {
                    headers[key] = value;
                });

                let output = `Status: ${response.status} ${response.statusText}\n\n`;
                output += `Response Headers:\n`;
                output += JSON.stringify(headers, null, 2);
                output += `\n\nCORS Headers:\n`;
                
                const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods', 
                                   'access-control-allow-headers', 'access-control-allow-credentials'];
                let hasCors = false;
                corsHeaders.forEach(header => {
                    if (headers[header]) {
                        output += `✅ ${header}: ${headers[header]}\n`;
                        hasCors = true;
                    }
                });
                
                if (!hasCors) {
                    output += `❌ No CORS headers found!\n`;
                }

                responseEl.textContent = output;
            } catch (error) {
                responseEl.textContent = `Error: ${error.message}\n\nThis might indicate:\n- Backend is not accessible\n- Network error\n- CORS is blocking the request`;
            }
        }

        async function testAPIGET() {
            const responseEl = document.getElementById('api-response');
            responseEl.style.display = 'block';
            responseEl.textContent = 'Testing GET request...\n\n';

            try {
                const response = await fetch('https://ccs4thyear.com/Books/Kian_Laravel/api/books', {
                    method: 'GET',
                    headers: {
                        'Origin': 'https://kianzhar.github.io'
                    }
                });

                const headers = {};
                response.headers.forEach((value, key) => {
                    headers[key] = value;
                });

                const data = await response.json().catch(() => ({ text: await response.text() }));

                let output = `Status: ${response.status} ${response.statusText}\n\n`;
                output += `CORS Headers:\n`;
                const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods'];
                corsHeaders.forEach(header => {
                    if (headers[header]) {
                        output += `✅ ${header}: ${headers[header]}\n`;
                    } else {
                        output += `❌ ${header}: Missing\n`;
                    }
                });
                output += `\nResponse Data:\n`;
                output += JSON.stringify(data, null, 2);

                responseEl.textContent = output;
            } catch (error) {
                responseEl.textContent = `Error: ${error.message}\n\nThis might indicate:\n- Backend is not accessible\n- CORS is blocking the request`;
            }
        }
    </script>
</body>
</html>
