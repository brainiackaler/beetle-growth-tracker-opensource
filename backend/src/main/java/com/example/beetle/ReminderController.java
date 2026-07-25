package com.example.beetle;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reminders")
@CrossOrigin
public class ReminderController {
    private final ReminderRuleRepository reminderRepository;
    private final NotificationSettingRepository settingRepository;
    private final BeetleRepository beetleRepository;
    private final BarkNotificationService barkNotificationService;
    private final TelegramNotificationService telegramNotificationService;
    private final TelegramBindingService telegramBindingService;
    private final NotificationDeliveryService notificationDeliveryService;

    public ReminderController(ReminderRuleRepository reminderRepository,
                              NotificationSettingRepository settingRepository,
                              BeetleRepository beetleRepository,
                              BarkNotificationService barkNotificationService,
                              TelegramNotificationService telegramNotificationService,
                              TelegramBindingService telegramBindingService,
                              NotificationDeliveryService notificationDeliveryService) {
        this.reminderRepository = reminderRepository;
        this.settingRepository = settingRepository;
        this.beetleRepository = beetleRepository;
        this.barkNotificationService = barkNotificationService;
        this.telegramNotificationService = telegramNotificationService;
        this.telegramBindingService = telegramBindingService;
        this.notificationDeliveryService = notificationDeliveryService;
    }

    private Long getUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    @GetMapping
    public Map<String, Object> list(HttpServletRequest request) {
        Long userId = getUserId(request);
        NotificationSetting setting = getOrCreateSetting(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("settings", setting);
        result.put("telegram", telegramBindingService.getStatus(setting));
        result.put("rules", reminderRepository.findByUserIdOrderByNextReminderDateAscCreatedAtDesc(userId));
        return result;
    }

    @PutMapping("/settings")
    public Map<String, NotificationSetting> updateSettings(HttpServletRequest request, @RequestBody NotificationSetting input) {
        Long userId = getUserId(request);
        NotificationSetting setting = getOrCreateSetting(userId);
        setting.setBarkServerUrl(barkNotificationService.normalizeServerUrl(input.getBarkServerUrl()));
        setting.setBarkDeviceKey(input.getBarkDeviceKey());
        setting.setEnabled(input.getEnabled() == null || input.getEnabled());
        return Collections.singletonMap("item", settingRepository.save(setting));
    }

    @PostMapping("/test")
    public Map<String, Boolean> test(HttpServletRequest request) {
        NotificationSetting setting = getOrCreateSetting(getUserId(request));
        try {
            barkNotificationService.send(setting, "甲虫提醒测试", "Bark 通知已连接成功，以后到期养护提醒会发送到这台设备。");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return Collections.singletonMap("ok", true);
    }

    @GetMapping("/telegram")
    public Map<String, Object> getTelegramStatus(HttpServletRequest request) {
        return telegramBindingService.getStatus(getOrCreateSetting(getUserId(request)));
    }

    @PostMapping("/telegram/bind")
    public Map<String, Object> startTelegramBinding(HttpServletRequest request) {
        try {
            return telegramBindingService.startBinding(getOrCreateSetting(getUserId(request)));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/telegram")
    public Map<String, Object> updateTelegramSettings(HttpServletRequest request, @RequestBody Map<String, Object> input) {
        boolean enabled = Boolean.TRUE.equals(input.get("enabled"));
        try {
            return telegramBindingService.setEnabled(getOrCreateSetting(getUserId(request)), enabled);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/telegram/test")
    public Map<String, Boolean> testTelegram(HttpServletRequest request) {
        NotificationSetting setting = getOrCreateSetting(getUserId(request));
        try {
            telegramNotificationService.send(
                    setting,
                    "甲虫提醒测试",
                    "Telegram 通知已连接成功，以后到期养护提醒会发送到这里。"
            );
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return Collections.singletonMap("ok", true);
    }

    @DeleteMapping("/telegram/bind")
    public Map<String, Object> unbindTelegram(HttpServletRequest request) {
        return telegramBindingService.unbind(getOrCreateSetting(getUserId(request)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, ReminderRule> create(HttpServletRequest request, @RequestBody ReminderRule input) {
        Long userId = getUserId(request);
        ensureBeetleBelongsToUser(input.getBeetleId(), userId);
        input.setId(null);
        input.setUserId(userId);
        return Collections.singletonMap("item", reminderRepository.save(input));
    }

    @PutMapping("/{id}")
    public Map<String, ReminderRule> update(HttpServletRequest request, @PathVariable String id, @RequestBody ReminderRule input) {
        Long userId = getUserId(request);
        ReminderRule rule = findRule(id, userId);
        ensureBeetleBelongsToUser(input.getBeetleId(), userId);
        rule.setBeetleId(input.getBeetleId());
        rule.setReminderType(input.getReminderType());
        rule.setTitle(input.getTitle());
        rule.setMessage(input.getMessage());
        rule.setIntervalDays(input.getIntervalDays());
        rule.setNextReminderDate(input.getNextReminderDate());
        rule.setEnabled(input.getEnabled());
        return Collections.singletonMap("item", reminderRepository.save(rule));
    }

    @PostMapping("/{id}/send-now")
    public Map<String, ReminderRule> sendNow(HttpServletRequest request, @PathVariable String id) {
        Long userId = getUserId(request);
        ReminderRule rule = findRule(id, userId);
        try {
            notificationDeliveryService.send(getOrCreateSetting(userId), rule.getTitle(), rule.getMessage());
            rule.markSent(LocalDate.now());
            return Collections.singletonMap("item", reminderRepository.save(rule));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        reminderRepository.delete(findRule(id, getUserId(request)));
        return Collections.singletonMap("ok", true);
    }

    private NotificationSetting getOrCreateSetting(Long userId) {
        return settingRepository.findByUserId(userId).orElseGet(() -> {
            NotificationSetting setting = barkNotificationService.buildDefaultSetting(userId);
            return settingRepository.save(setting);
        });
    }

    private ReminderRule findRule(String id, Long userId) {
        ReminderRule rule = reminderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        if (!userId.equals(rule.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found");
        }
        return rule;
    }

    private void ensureBeetleBelongsToUser(String beetleId, Long userId) {
        if (beetleId == null || beetleId.trim().isEmpty()) {
            return;
        }
        Beetle beetle = beetleRepository.findById(beetleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "beetle_not_found"));
        if (!userId.equals(beetle.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "beetle_not_found");
        }
    }
}
