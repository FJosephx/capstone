package com.avatargamer.backend.security.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Component
public class JwtUtil {

    private SecretKey key;
    private final long expiresInSeconds;
    private final String issuer;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiresIn:1800}") long expiresInSeconds, // 30 min por defecto
            @Value("${app.jwt.issuer:avatargamer}") String issuer
    ) {
        // Si te pasan un secreto en base64, úsalo tal cual; si no, usa los bytes directos.
        // Preferimos base64url si lo tienes, pero esto funciona con ambos.
        try {
            byte[] secretBytes = Decoders.BASE64.decode(secret);
            this.key = Keys.hmacShaKeyFor(secretBytes);
        } catch (Exception ignored) {
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        }
        this.expiresInSeconds = expiresInSeconds;
        this.issuer = issuer;
    }

    /** Genera un JWT con subject=username y claim 'roles' como lista de String. */
    public String generate(String username, Collection<String> roles) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(expiresInSeconds);

        return Jwts.builder()
                .setSubject(username)
                .setIssuer(issuer)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .addClaims(Map.of("roles", roles == null ? List.of() : List.copyOf(roles)))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /** Valida firma y expiración. */
    public boolean isValid(String token) {
        try {
            parse(token); // si parsea, está firmado y no expiró
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Obtiene el username (subject) del token. */
    public String getUsername(String token) {
        return parse(token).getBody().getSubject();
    }

    /** Devuelve los roles almacenados como claim 'roles' (lista de String). */
    @SuppressWarnings("unchecked")
    public List<String> getAuthorities(String token) {
        Claims claims = parse(token).getBody();
        Object raw = claims.get("roles");
        if (raw == null) return List.of();

        // El claim puede venir como List<?>; lo convertimos de forma segura a List<String>.
        if (raw instanceof List<?> list) {
            return list.stream()
                    .filter(e -> e != null)
                    .map(Object::toString)
                    .toList();
        }
        // Si por alguna razón viniera serializado como String (JSON), intentamos parsearlo.
        if (raw instanceof String s) {
            try {
                List<?> list = mapper.readValue(s, List.class);
                return list.stream().map(String::valueOf).toList();
            } catch (Exception ignored) {
                return List.of();
            }
        }
        return List.of();
    }

    // ---------- helpers ----------
    private Jws<Claims> parse(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
    }

    public long getExpiresInSeconds() {
        return expiresInSeconds;
    }
}
