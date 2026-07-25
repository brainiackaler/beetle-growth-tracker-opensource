package com.example.beetle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class BarkNotificationService {
    private static final String DEFAULT_SERVER_URL = "https://api.day.app";
    private static final String APP_NAME = "甲虫成长记录";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String appIconUrl;

    public BarkNotificationService(ObjectMapper objectMapper,
                                   @Value("${notification.bark.icon-url:}") String appIconUrl) {
        this.objectMapper = objectMapper;
        this.appIconUrl = clean(appIconUrl);
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(requestFactory);
    }

    public void send(NotificationSetting setting, String title, String body) {
        if (setting == null || setting.getEnabled() == null || !setting.getEnabled()) {
            throw new IllegalArgumentException("notification_disabled");
        }
        String deviceKey = clean(setting.getBarkDeviceKey());
        if (deviceKey.isEmpty()) {
            throw new IllegalArgumentException("bark_key_missing");
        }

        String serverUrl = normalizeServerUrl(setting.getBarkServerUrl());
        Map<String, Object> payload = new HashMap<>();
        payload.put("device_key", deviceKey);
        payload.put("title", clean(title).isEmpty() ? "甲虫提醒" : clean(title));
        payload.put("body", clean(body).isEmpty() ? "有一条甲虫养护提醒到期了" : clean(body));
        payload.put("group", APP_NAME);
        if (!appIconUrl.isEmpty()) {
            payload.put("icon", appIconUrl);
        }
        payload.put("level", "active");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> response = restTemplate.postForEntity(serverUrl + "/push", new HttpEntity<>(payload, headers), String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("bark_http_" + response.getStatusCodeValue());
        }
        verifyBarkBody(response.getBody());
    }

    public NotificationSetting buildDefaultSetting(Long userId) {
        NotificationSetting setting = new NotificationSetting();
        setting.setUserId(userId);
        setting.setBarkServerUrl(DEFAULT_SERVER_URL);
        setting.setEnabled(true);
        return setting;
    }

    public String normalizeServerUrl(String value) {
        String url = clean(value);
        if (url.isEmpty()) {
            url = DEFAULT_SERVER_URL;
        }
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        return url;
    }

    private void verifyBarkBody(String body) {
        if (body == null || body.trim().isEmpty()) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode code = root.get("code");
            if (code != null && code.isNumber() && code.asInt() != 200) {
                String message = root.has("message") ? root.get("message").asText() : "bark_failed";
                throw new IllegalStateException(message);
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception ignored) {
            // Some compatible Bark servers may return non-JSON success bodies.
        }
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
