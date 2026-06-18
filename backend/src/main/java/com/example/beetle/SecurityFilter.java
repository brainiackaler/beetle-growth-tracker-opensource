package com.example.beetle;

import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.security.passcode:}")
    private String passcode;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();
        
        // Skip security check for health endpoint, login endpoint, and static assets
        if (!path.startsWith("/api") || path.equals("/api/health") || path.equals("/api/auth/login")) {
            chain.doFilter(request, response);
            return;
        }

        // If passcode is not configured in the environment, allow all requests
        if (passcode == null || passcode.trim().isEmpty()) {
            chain.doFilter(request, response);
            return;
        }

        String reqPasscode = req.getHeader("X-Passcode");
        if (passcode.trim().equals(reqPasscode)) {
            chain.doFilter(request, response);
        } else {
            res.setStatus(HttpStatus.UNAUTHORIZED.value());
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write("{\"error\":\"unauthorized\",\"message\":\"Invalid passcode\"}");
        }
    }
}
