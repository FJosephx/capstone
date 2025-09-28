package com.avatargamer.backend.common.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public final class RequestInfo {
    private RequestInfo() {}

    // IP real (X-Forwarded-For) o remoteAddr. Truncamos para evitar columnas largas.
    public static String ip(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        String value = StringUtils.hasText(xff) ? xff.split(",")[0].trim() : req.getRemoteAddr();
        return truncate(value, 45); // suficiente para IPv6
    }

    // User-Agent null-safe
    public static String ua(HttpServletRequest req) {
        String h = req.getHeader("User-Agent");
        if (!StringUtils.hasText(h)) return "?";
        return truncate(h, 255);
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
