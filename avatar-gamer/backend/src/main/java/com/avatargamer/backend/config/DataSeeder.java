package com.avatargamer.backend.config;

import com.avatargamer.backend.auth.entity.Role;
import com.avatargamer.backend.auth.entity.User;
import com.avatargamer.backend.auth.repo.RoleRepository;
import com.avatargamer.backend.auth.repo.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Set;

@Configuration
public class DataSeeder {

    CommandLineRunner seed(PasswordEncoder encoder, UserRepository users, RoleRepository roles) {
        return args -> {
            Role op = roles.findByName("ROLE_OPERATOR")
                    .orElseGet(() -> roles.save(Role.builder().name("ROLE_OPERATOR").build()));

            if (!users.existsByUsername("operador")) {
                users.save(User.builder()
                        .username("operador")
                        .email("operador@local")
                        .passwordHash(encoder.encode("clave123"))
                        .enabled(true)
                        .failedAttempts(0)
                        .createdAt(Instant.now())
                        .roles(Set.of(op))
                        .build());
            }
        };
    }
}
