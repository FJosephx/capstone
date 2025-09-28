package com.avatargamer.backend.auth.controller;

import com.avatargamer.backend.auth.dto.LoginRequest;
import com.avatargamer.backend.auth.dto.LoginResponse;
import com.avatargamer.backend.auth.dto.UserMe;
import com.avatargamer.backend.auth.entity.User;
import com.avatargamer.backend.auth.repo.UserRepository;
import com.avatargamer.backend.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final UserRepository users;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return authService.login(req, http);
    }

    @GetMapping("/me")
    public UserMe me(Authentication auth) {
        if (auth == null || auth.getName() == null) throw new RuntimeException("Unauthorized");
        User u = users.findByUsername(auth.getName()).orElseThrow(() -> new RuntimeException("Unauthorized"));
        var roles = u.getRoles().stream().map(r -> r.getName()).toList();
        return new UserMe(u.getId(), u.getUsername(), u.getEmail(), roles);
    }
}
