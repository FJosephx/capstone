package com.avatargamer.backend.auth.service;

import com.avatargamer.backend.auth.dto.LoginRequest;
import com.avatargamer.backend.auth.dto.LoginResponse;
import com.avatargamer.backend.auth.dto.UserMe;
import com.avatargamer.backend.auth.entity.SecurityLog;
import com.avatargamer.backend.auth.entity.User;
import com.avatargamer.backend.auth.repo.SecurityLogRepository;
import com.avatargamer.backend.auth.repo.UserRepository;
import com.avatargamer.backend.security.jwt.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static com.avatargamer.backend.common.util.RequestInfo.ip;
import static com.avatargamer.backend.common.util.RequestInfo.ua;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final SecurityLogRepository logs;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;
    private final ObjectMapper om;

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCK_TIME = Duration.ofMinutes(15);

    public LoginResponse login(LoginRequest req, HttpServletRequest http) {
        User u = users.findByUsername(req.username())
                .orElseThrow(() -> unauthorized("Usuario o contraseña inválidos"));

        if (!u.isEnabled()) throw unauthorized("Cuenta deshabilitada");

        Instant now = Instant.now();
        if (u.getLockedUntil() != null && u.getLockedUntil().isAfter(now)) {
            audit(u.getUsername(), "ACCOUNT_LOCKED", http,
                    meta("lockedUntil", u.getLockedUntil().toString()));
            throw unauthorized("Cuenta bloqueada temporalmente. Intenta más tarde.");
        }

        boolean ok = encoder.matches(req.password(), u.getPasswordHash());
        if (!ok) {
            int fa = u.getFailedAttempts() + 1;
            u.setFailedAttempts(fa);
            if (fa >= MAX_ATTEMPTS) {
                u.setLockedUntil(now.plus(LOCK_TIME));
                audit(u.getUsername(), "ACCOUNT_LOCKED", http,
                        meta("afterFailedAttempts", fa));
            }
            users.save(u);
            audit(req.username(), "LOGIN_FAILURE", http, null);
            throw unauthorized("Usuario o contraseña inválidos");
        }

        // éxito
        u.setFailedAttempts(0);
        u.setLockedUntil(null);
        users.save(u);

        List<String> roles = u.getRoles().stream().map(r -> r.getName()).toList();
        String access = jwt.generate(u.getUsername(), roles);
        audit(u.getUsername(), "LOGIN_SUCCESS", http, null);

        UserMe me = new UserMe(u.getId(), u.getUsername(), u.getEmail(), roles);
        return new LoginResponse(access, null, 60L * 30L, me);
    }

    private RuntimeException unauthorized(String msg) {
        return new RuntimeException(msg); // Se traduce en @ControllerAdvice
    }

    private void audit(String username, String event, HttpServletRequest req, JsonNode meta) {
        logs.save(SecurityLog.builder()
                .username(username)
                .eventType(event)
                .ip(ip(req))
                .userAgent(ua(req))
                .createdAt(Instant.now())
                .metadataJson(meta)
                .build());
    }

    private ObjectNode meta(Object k, Object v) {
        ObjectNode node = om.createObjectNode();
        if (k != null) {
            if (v == null) {
                node.putNull(k.toString());
            } else {
                node.putPOJO(k.toString(), v);
            }
        }
        return node;
    }
}
