package com.avatargamer.backend.auth.dto;

public record LoginResponse(
    String accessToken,
    String refreshToken,// de momento null; más adelante se activará
    long expiresIn,
    UserMe me
) { }
