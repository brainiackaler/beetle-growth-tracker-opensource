package com.example.beetle;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class SecurityFilter implements Filter {

    private final JwtUtils jwtUtils;

    public SecurityFilter(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();

        // Telegram verifies its public webhook with a secret header inside TelegramWebhookController.
        boolean publicTelegramWebhook = path.equals("/api/integrations/telegram/webhook");

        // Skip security check for public endpoints and static assets.
        if (!path.startsWith("/api")
                || path.equals("/api/health")
                || path.startsWith("/api/auth/")
                || publicTelegramWebhook) {
            chain.doFilter(request, response);
            return;
        }

        String authHeader = req.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateToken(token)) {
                Long userId = jwtUtils.getUserIdFromToken(token);
                if (userId != null) {
                    req.setAttribute("userId", userId);
                    chain.doFilter(request, response);
                    return;
                }
            }
        }

        res.setStatus(HttpStatus.UNAUTHORIZED.value());
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"error\":\"unauthorized\",\"message\":\"Invalid or missing token\"}");
    }
}
