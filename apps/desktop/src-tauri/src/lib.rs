#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            start_oauth_loopback_redirect_server(app.handle().clone());
            Ok(())
        })
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running nado desktop app");
}

fn start_oauth_loopback_redirect_server(app_handle: tauri::AppHandle) {
    std::thread::spawn(move || {
        let listener = match std::net::TcpListener::bind("127.0.0.1:17654") {
            Ok(listener) => listener,
            Err(error) => {
                emit_desktop_oauth_loopback_error(&app_handle, &error.to_string());
                return;
            }
        };

        for stream in listener.incoming().flatten() {
            handle_oauth_loopback_request(stream, &app_handle);
        }
    });
}

fn emit_desktop_oauth_loopback_error(app_handle: &tauri::AppHandle, message: &str) {
    use tauri::Emitter;

    let _ = app_handle.emit("desktop-oauth-loopback-error", message);
}

fn handle_oauth_loopback_request(mut stream: std::net::TcpStream, app_handle: &tauri::AppHandle) {
    use std::time::Duration;

    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let request = read_http_request(&mut stream);
    let (method, path) = request_line_parts(&request);

    if method == "GET" {
        if let Some(payload) = callback_payload_from_request_target(&path) {
            emit_desktop_oauth_callback(app_handle, &payload);
            write_http_response(
                &mut stream,
                completed_oauth_page(),
                "text/html; charset=utf-8",
            );
            return;
        }
    }

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
    <h1>nado login callback is unavailable.</h1>
    <p>Return to nado and start Google login again.</p>
  </body>
</html>"#;
    write_http_response(&mut stream, body, "text/html; charset=utf-8");
}

fn emit_desktop_oauth_callback(app_handle: &tauri::AppHandle, payload: &str) {
    use tauri::{Emitter, Manager, UserAttentionType};

    if payload.starts_with('?') || payload.starts_with('#') {
        let _ = app_handle.emit(
            "desktop-oauth-callback",
            format!("nado://auth/callback{payload}"),
        );
    }

    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        let _ = window.request_user_attention(Some(UserAttentionType::Informational));
    }
}

fn read_http_request(stream: &mut std::net::TcpStream) -> Vec<u8> {
    use std::io::{ErrorKind, Read};

    let mut request = Vec::new();
    let mut buffer = [0_u8; 4096];

    loop {
        match stream.read(&mut buffer) {
            Ok(0) => break,
            Ok(bytes_read) => {
                request.extend_from_slice(&buffer[..bytes_read]);

                if request.len() > 131_072 || has_complete_http_request(&request) {
                    break;
                }
            }
            Err(error)
                if error.kind() == ErrorKind::WouldBlock || error.kind() == ErrorKind::TimedOut =>
            {
                break;
            }
            Err(_) => break,
        }
    }

    request
}

fn has_complete_http_request(request: &[u8]) -> bool {
    let Some(header_end) = find_header_end(request) else {
        return false;
    };

    let headers = String::from_utf8_lossy(&request[..header_end]);
    let content_length = headers
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;

            if name.eq_ignore_ascii_case("content-length") {
                Some(value)
            } else {
                None
            }
        })
        .and_then(|value| value.trim().parse::<usize>().ok())
        .unwrap_or(0);

    request.len() >= header_end + 4 + content_length
}

fn request_line_parts(request: &[u8]) -> (String, String) {
    let request_text = String::from_utf8_lossy(request);
    let mut parts = request_text
        .lines()
        .next()
        .unwrap_or_default()
        .split_whitespace();

    (
        parts.next().unwrap_or_default().to_string(),
        parts.next().unwrap_or_default().to_string(),
    )
}

fn callback_payload_from_request_target(target: &str) -> Option<String> {
    let (path, query) = target.split_once('?')?;

    if path != "/" || query.is_empty() || !contains_oauth_callback_parameter(query) {
        return None;
    }

    Some(format!("?{query}"))
}

fn contains_oauth_callback_parameter(query: &str) -> bool {
    query.split('&').any(|parameter| {
        matches!(
            parameter
                .split_once('=')
                .map(|(key, _)| key)
                .unwrap_or(parameter),
            "code" | "error" | "error_code"
        )
    })
}

fn find_header_end(request: &[u8]) -> Option<usize> {
    request.windows(4).position(|window| window == b"\r\n\r\n")
}

fn completed_oauth_page() -> &'static str {
    r#"<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <title>nado login completed</title>
    <style>
      body {
        color: #20201d;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 40px;
      }
    </style>
  </head>
  <body>
    <h1>nado login completed.</h1>
    <p>You can close this tab and return to the nado app.</p>
    <script>
      window.setTimeout(() => window.close(), 300);
    </script>
  </body>
</html>"#
}

fn write_http_response(stream: &mut std::net::TcpStream, body: &str, content_type: &str) {
    use std::io::Write;

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: {content_type}\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );

    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

#[cfg(test)]
mod tests {
    use super::callback_payload_from_request_target;

    #[test]
    fn accepts_only_pkce_codes_or_oauth_errors_on_the_loopback_root_path() {
        assert_eq!(
            callback_payload_from_request_target("/?code=authorization-code&state=state"),
            Some("?code=authorization-code&state=state".to_string())
        );
        assert_eq!(
            callback_payload_from_request_target("/?error=access_denied"),
            Some("?error=access_denied".to_string())
        );
        assert_eq!(callback_payload_from_request_target("/?term=word"), None);
        assert_eq!(
            callback_payload_from_request_target("/desktop-auth-callback?code=authorization-code"),
            None
        );
    }
}
