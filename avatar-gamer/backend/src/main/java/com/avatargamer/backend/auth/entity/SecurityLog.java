package com.avatargamer.backend.auth.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity @Table(name = "security_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false, length = 50)
    private String eventType; //LOGIN_SUCCESS, LOGIN_FAILURE, ACCOUNT_LOCKED

    @Column(length = 64)
    private String ip;

    @Column(length = 255)
    private String userAgent;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(name = "metadata_json", columnDefinition = "jsonb", nullable = true)
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode metadataJson;
}
