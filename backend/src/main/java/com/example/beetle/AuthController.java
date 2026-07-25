package com.example.beetle;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final BeetleRepository beetleRepository;
    private final CostRecordRepository costRecordRepository;
    private final JwtUtils jwtUtils;
    private final boolean registrationEnabled;

    public AuthController(UserRepository userRepository,
                          BeetleRepository beetleRepository,
                          CostRecordRepository costRecordRepository,
                          JwtUtils jwtUtils,
                          @Value("${app.registration.enabled:true}") boolean registrationEnabled) {
        this.userRepository = userRepository;
        this.beetleRepository = beetleRepository;
        this.costRecordRepository = costRecordRepository;
        this.jwtUtils = jwtUtils;
        this.registrationEnabled = registrationEnabled;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> body) {
        if (!registrationEnabled) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "registration_disabled");
        }

        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_input");
        }

        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username_exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt()));
        user = userRepository.save(user);

        String token = jwtUtils.generateToken(user.getId(), user.getUsername());
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", token);
        result.put("username", user.getUsername());
        return result;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_input");
        }

        Optional<User> optionalUser = userRepository.findByUsername(username);
        if (!optionalUser.isPresent() || !BCrypt.checkpw(password, optionalUser.get().getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
        }

        User user = optionalUser.get();
        String token = jwtUtils.generateToken(user.getId(), user.getUsername());

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", token);
        result.put("username", user.getUsername());
        return result;
    }
}
