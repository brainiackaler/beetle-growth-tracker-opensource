package com.example.beetle;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class TelegramCommandService {
    private static final int REMINDER_PREVIEW_LIMIT = 5;

    private final NotificationSettingRepository settingRepository;
    private final ReminderRuleRepository reminderRepository;

    public TelegramCommandService(NotificationSettingRepository settingRepository,
                                  ReminderRuleRepository reminderRepository) {
        this.settingRepository = settingRepository;
        this.reminderRepository = reminderRepository;
    }

    public String handleStart(String chatId) {
        if (!findSetting(chatId).isPresent()) {
            return bindingRequiredMessage();
        }
        return "这个 Telegram 账号已经绑定甲虫成长记录。\n\n" + helpMessage();
    }

    @Transactional
    public String handle(String chatId, String command) {
        Optional<NotificationSetting> settingOptional = findSetting(chatId);
        if (!settingOptional.isPresent()) {
            return bindingRequiredMessage();
        }

        NotificationSetting setting = settingOptional.get();
        String normalizedCommand = clean(command).toLowerCase(Locale.ROOT);
        if ("reminders".equals(normalizedCommand)) {
            return buildReminderList(setting.getUserId());
        }
        if ("status".equals(normalizedCommand)) {
            return buildStatus(setting);
        }
        if ("pause".equals(normalizedCommand)) {
            return pause(setting);
        }
        if ("resume".equals(normalizedCommand)) {
            return resume(setting);
        }
        if ("help".equals(normalizedCommand)) {
            return helpMessage();
        }
        return "暂不支持这个命令。\n\n" + helpMessage();
    }

    private String pause(NotificationSetting setting) {
        if (!Boolean.TRUE.equals(setting.getTelegramEnabled())) {
            return "Telegram 通知已经处于暂停状态。\n发送 /resume 可以恢复通知。";
        }
        setting.setTelegramEnabled(false);
        settingRepository.save(setting);
        return "Telegram 通知已暂停。\n到期提醒暂时不会发送到这里，发送 /resume 可以恢复。";
    }

    private String resume(NotificationSetting setting) {
        if (Boolean.TRUE.equals(setting.getTelegramEnabled())) {
            return "Telegram 通知已经启用。\n发送 /reminders 可以查看近期提醒。";
        }
        setting.setTelegramEnabled(true);
        settingRepository.save(setting);
        return "Telegram 通知已恢复。\n以后到期的甲虫养护提醒会继续发送到这里。";
    }

    private String buildStatus(NotificationSetting setting) {
        List<ReminderRule> activeRules = findActiveRules(setting.getUserId());
        StringBuilder result = new StringBuilder();
        result.append("Telegram 通知：")
                .append(Boolean.TRUE.equals(setting.getTelegramEnabled()) ? "已启用" : "已暂停")
                .append("\n启用中的提醒：")
                .append(activeRules.size())
                .append(" 条");
        if (!activeRules.isEmpty()) {
            ReminderRule nextRule = activeRules.get(0);
            result.append("\n下一条：")
                    .append(displayDate(nextRule))
                    .append(" · ")
                    .append(displayTitle(nextRule));
        }
        return result.toString();
    }

    private String buildReminderList(Long userId) {
        List<ReminderRule> activeRules = findActiveRules(userId);
        if (activeRules.isEmpty()) {
            return "当前没有启用中的提醒。\n可以回到甲虫成长记录网页新建提醒。";
        }

        StringBuilder result = new StringBuilder();
        result.append("近期启用提醒（共 ")
                .append(activeRules.size())
                .append(" 条）：\n");
        int previewCount = Math.min(activeRules.size(), REMINDER_PREVIEW_LIMIT);
        for (int index = 0; index < previewCount; index++) {
            ReminderRule rule = activeRules.get(index);
            result.append("\n")
                    .append(index + 1)
                    .append(". ")
                    .append(displayDate(rule))
                    .append(" · ")
                    .append(displayTitle(rule));
            if (rule.getIntervalDays() != null && rule.getIntervalDays() > 0) {
                result.append("\n   每 ").append(rule.getIntervalDays()).append(" 天");
            }
        }
        if (activeRules.size() > previewCount) {
            result.append("\n\n另有 ")
                    .append(activeRules.size() - previewCount)
                    .append(" 条，请在网页中查看。");
        }
        return result.toString();
    }

    private List<ReminderRule> findActiveRules(Long userId) {
        List<ReminderRule> result = new ArrayList<>();
        for (ReminderRule rule : reminderRepository.findByUserIdOrderByNextReminderDateAscCreatedAtDesc(userId)) {
            if (Boolean.TRUE.equals(rule.getEnabled())) {
                result.add(rule);
            }
        }
        return result;
    }

    private Optional<NotificationSetting> findSetting(String chatId) {
        String cleanChatId = clean(chatId);
        if (cleanChatId.isEmpty()) {
            return Optional.empty();
        }
        return settingRepository.findByTelegramChatId(cleanChatId);
    }

    private String bindingRequiredMessage() {
        return "这个 Telegram 账号尚未绑定。\n"
                + "请先在甲虫成长记录网页的提醒页面点击“绑定 Telegram”，再打开生成的绑定链接。";
    }

    private String helpMessage() {
        return "可用命令：\n"
                + "/reminders - 查看近期提醒\n"
                + "/status - 查看通知状态\n"
                + "/pause - 暂停 Telegram 通知\n"
                + "/resume - 恢复 Telegram 通知\n"
                + "/help - 查看帮助";
    }

    private String displayDate(ReminderRule rule) {
        String date = clean(rule.getNextReminderDate());
        return date.isEmpty() ? "日期未设置" : date;
    }

    private String displayTitle(ReminderRule rule) {
        String title = clean(rule.getTitle());
        return title.isEmpty() ? "甲虫提醒" : title;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
