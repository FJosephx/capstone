package com.avatargamer.backend.auth.dto;

import java.util.List;

public record UserMe(
        Long id,
        String username,
        String email,
        List<String> roles
) { }
