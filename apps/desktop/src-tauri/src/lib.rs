#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    start_oauth_loopback_redirect_server();

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running nado desktop app");
}

fn start_oauth_loopback_redirect_server() {
    std::thread::spawn(|| {
        let listener = match std::net::TcpListener::bind("127.0.0.1:3000") {
            Ok(listener) => listener,
            Err(_) => return,
        };

        for stream in listener.incoming().flatten() {
            handle_oauth_loopback_request(stream);
        }
    });
}

fn handle_oauth_loopback_request(mut stream: std::net::TcpStream) {
    use std::io::{Read, Write};

    let mut buffer = [0_u8; 1024];
    let _ = stream.read(&mut buffer);

    let body = r#"<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <title>nado login</title>
    <style>
      body {
        color: #20201d;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 40px;
      }

      a {
        background: #20201d;
        border-radius: 10px;
        color: #ffffff;
        display: inline-block;
        font-weight: 800;
        margin-top: 16px;
        padding: 12px 16px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <h1>nado app login is finishing.</h1>
    <p>If the app does not open automatically, click the button below.</p>
    <a id="return-to-app" href="nado://auth/callback">Return to nado app</a>
    <script>
      const callbackUrl = "nado://auth/callback" + window.location.search + window.location.hash;
      const link = document.getElementById("return-to-app");
      link.href = callbackUrl;
      window.location.href = callbackUrl;
    </script>
  </body>
</html>"#;
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );

    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}
