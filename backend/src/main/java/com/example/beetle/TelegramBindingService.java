package com.example.beetle;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class TelegramBindingService {
    private static final long BIND_TTL_MILLIS = 10 * 60 * 1000L;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final NotificationSettingRepository settingRepository;
    private final TelegramNotificationService telegramNotificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    public TelegramBindingService(NotificationSettingRepository settingRepository,
                                  TelegramNotificationService telegramNotificationService) {
        this.settingRepository = settingRepository;
        this.telegramNotificationService = telegramNotificationService;
    }

    @Transactional
    public Map<String, Object> startBinding(NotificationSetting setting) {
        if (!telegramNotificationService.isConfigured()) {
            throw new IllegalStateException("telegram_not_configured");
        }

        byte[] randomBytes = new byte[24];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        long expiresAt = System.currentTimeMillis() + BIND_TTL_MILLIS;

        setting.setTelegramBindTokenHash(hash(token));
        setting.setTelegramBindExpiresAt(expiresAt);
        settingRepository.save(setting);

        Map<String, Object> result = new HashMap<>();
        result.put("url", telegramNotificationService.createBindUrl(token));
        result.put("expiresAt", expiresAt);
        return result;
    }

    public Map<String, Object> getStatus(NotificationSetting setting) {
        Map<String, Object> result = new HashMap<>();
        boolean bound = hasText(setting.getTelegramChatId());
        result.put("configured", telegramNotificationService.isConfigured());
        result.put("bound", bound);
        result.put("enabled", bound && Boolean.TRUE.equals(setting.getTelegramEnabled()));
        result.put("username", clean(setting.getTelegramUsername()));
        result.put("displayName", clean(setting.getTelegramDisplayName()));
        result.put("botUsername", telegramNotificationService.getKnownBotUsername());
        result.put("boundAt", clean(setting.getTelegramBoundAt()));
        return result;
    }

    @Transactional
    public Map<String, Object> setEnabled(NotificationSetting setting, boolean enabled) {
        if (enabled && !hasText(setting.getTelegramChatId())) {
            throw new IllegalArgumentException("telegram_not_bound");
        }
        setting.setTelegramEnabled(enabled);
        return getStatus(settingRepository.save(setting));
    }

    @Transactional
    public Map<String, Object> unbind(NotificationSetting setting) {
        setting.setTelegramEnabled(false);
        setting.setTelegramChatId(null);
        setting.setTelegramUsername(null);
        setting.setTelegramDisplayName(null);
        setting.setTelegramBoundAt(null);
        setting.setTelegramBindTokenHash(null);
        setting.setTelegramBindExpiresAt(null);
        return getStatus(settingRepository.save(setting));
    }

    @Transactional
    public BindResult bind(String token, String chatId, String username, String firstName, String lastName) {
        String cleanToken = clean(token);
        String cleanChatId = clean(chatId);
        if (!cleanToken.matches("[A-Za-z0-9_-]{16,64}") || cleanChatId.isEmpty()) {
            return BindResult.failure("绑定链接无效，请回到甲虫成长记录重新发起绑定。");
        }

        Optional<NotificationSetting> settingOptional = settingRepository.findByTelegramBindTokenHash(hash(cleanToken));
        if (!settingOptional.isPresent()) {
            return BindResult.failure("绑定链接已失效，请回到甲虫成长记录重新发起绑定。");
        }

        NotificationSetting setting = settingOptional.get();
        Long expiresAt = setting.getTelegramBindExpiresAt();
        if (expiresAt == null || expiresAt < System.currentTimeMillis()) {
            setting.setTelegramBindTokenHash(null);
            setting.setTelegramBindExpiresAt(null);
            settingRepository.save(setting);
            return BindResult.failure("绑定链接已过期，请回到甲虫成长记录重新发起绑定。");
        }

        Optional<NotificationSetting> existing = settingRepository.findByTelegramChatId(cleanChatId);
        if (existing.isPresent() && !existing.get().getId().equals(setting.getId())) {
            return BindResult.failure("这个 Telegram 账号已经绑定了另一个甲虫成长记录账号，请先在原账号中解绑。");
        }

        setting.setTelegramChatId(cleanChatId);
        setting.setTelegramUsername(truncate(clean(username), 64));
        setting.setTelegramDisplayName(truncate(buildDisplayName(firstName, lastName), 100));
        setting.setTelegramEnabled(true);
        setting.setTelegramBoundAt(LocalDateTime.now().format(DATE_TIME_FORMATTER));
        setting.setTelegramBindTokenHash(null);
        setting.setTelegramBindExpiresAt(null);
        settingRepository.save(setting);
        return BindResult.success("Telegram 绑定成功。以后到期的甲虫养护提醒会发送到这里。");
    }

    private String buildDisplayName(String firstName, String lastName) {
        return (clean(firstName) + " " + clean(lastName)).trim();
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                result.append(String.format("%02x", item & 0xff));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("sha256_unavailable");
        }
    }

    private String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private boolean hasText(String value) {
        return !clean(value).isEmpty();
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    public static class BindResult {
        private final boolean success;
        private final String message;

        private BindResult(boolean success, String message) {
            this.success = success;
            this.message = message;
        }

        public static BindResult success(String message) {
            return new BindResult(true, message);
        }

        public static BindResult failure(String message) {
            return new BindResult(false, message);
        }

        public boolean isSuccess() {
            return success;
        }

        public String getMessage() {
            return message;
        }
    }
}
