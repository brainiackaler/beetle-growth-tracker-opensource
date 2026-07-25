package com.example.beetle;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class ReminderScheduler {
    private final ReminderRuleRepository reminderRepository;
    private final NotificationSettingRepository settingRepository;
    private final BeetleRepository beetleRepository;
    private final NotificationDeliveryService notificationDeliveryService;

    public ReminderScheduler(ReminderRuleRepository reminderRepository,
                             NotificationSettingRepository settingRepository,
                             BeetleRepository beetleRepository,
                             NotificationDeliveryService notificationDeliveryService) {
        this.reminderRepository = reminderRepository;
        this.settingRepository = settingRepository;
        this.beetleRepository = beetleRepository;
        this.notificationDeliveryService = notificationDeliveryService;
    }

    @Scheduled(fixedDelay = 300000, initialDelay = 30000)
    public void sendDueReminders() {
        LocalDate today = LocalDate.now();
        List<ReminderRule> dueRules = reminderRepository.findByEnabledTrueAndNextReminderDateLessThanEqual(today.toString());
        for (ReminderRule rule : dueRules) {
            try {
                Optional<NotificationSetting> setting = settingRepository.findByUserId(rule.getUserId());
                if (!setting.isPresent() || !notificationDeliveryService.hasEnabledChannel(setting.get())) {
                    continue;
                }
                notificationDeliveryService.send(setting.get(), rule.getTitle(), buildBody(rule));
                rule.markSent(today);
                reminderRepository.save(rule);
            } catch (Exception e) {
                System.err.println("[ReminderScheduler] Failed to send reminder " + rule.getId() + ": " + e.getMessage());
            }
        }
    }

    private String buildBody(ReminderRule rule) {
        StringBuilder body = new StringBuilder();
        String beetleName = beetleRepository.findById(rule.getBeetleId())
                .map(Beetle::getName)
                .filter(name -> name != null && !name.trim().isEmpty())
                .orElse("");
        if (!beetleName.isEmpty()) {
            body.append(beetleName).append("：");
        }
        if (rule.getMessage() != null && !rule.getMessage().trim().isEmpty()) {
            body.append(rule.getMessage().trim());
        } else {
            body.append("有一条养护提醒到期了");
        }
        body.append("\n下次提醒：").append(LocalDate.now().plusDays(rule.getIntervalDays() == null ? 1 : rule.getIntervalDays()));
        return body.toString();
    }
}
