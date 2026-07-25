package com.example.beetle;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramCommandServiceTest {
    @Mock
    private NotificationSettingRepository settingRepository;

    @Mock
    private ReminderRuleRepository reminderRepository;

    private TelegramCommandService commandService;
    private NotificationSetting setting;

    @BeforeEach
    void setUp() {
        commandService = new TelegramCommandService(settingRepository, reminderRepository);
        setting = new NotificationSetting();
        setting.setId("setting-1");
        setting.setUserId(1L);
        setting.setTelegramChatId("123456789");
        setting.setTelegramEnabled(true);
    }

    @Test
    void remindersListsOnlyEnabledRules() {
        ReminderRule first = reminder("第一条", "2026-07-26", true);
        ReminderRule disabled = reminder("已停用", "2026-07-27", false);
        ReminderRule second = reminder("第二条", "2026-07-28", true);
        when(settingRepository.findByTelegramChatId("123456789")).thenReturn(Optional.of(setting));
        when(reminderRepository.findByUserIdOrderByNextReminderDateAscCreatedAtDesc(1L))
                .thenReturn(Arrays.asList(first, disabled, second));

        String reply = commandService.handle("123456789", "reminders");

        assertTrue(reply.contains("第一条"));
        assertTrue(reply.contains("第二条"));
        assertFalse(reply.contains("已停用"));
    }

    @Test
    void pauseDisablesTelegramDelivery() {
        when(settingRepository.findByTelegramChatId("123456789")).thenReturn(Optional.of(setting));

        String reply = commandService.handle("123456789", "pause");

        assertFalse(setting.getTelegramEnabled());
        assertTrue(reply.contains("已暂停"));
        verify(settingRepository).save(setting);
    }

    @Test
    void unboundAccountCannotReadReminders() {
        when(settingRepository.findByTelegramChatId("999")).thenReturn(Optional.empty());

        String reply = commandService.handle("999", "reminders");

        assertTrue(reply.contains("尚未绑定"));
    }

    @Test
    void statusShowsNextActiveReminder() {
        when(settingRepository.findByTelegramChatId("123456789")).thenReturn(Optional.of(setting));
        when(reminderRepository.findByUserIdOrderByNextReminderDateAscCreatedAtDesc(1L))
                .thenReturn(Collections.singletonList(reminder("开产房", "2026-07-26", true)));

        String reply = commandService.handle("123456789", "status");

        assertTrue(reply.contains("已启用"));
        assertTrue(reply.contains("2026-07-26 · 开产房"));
    }

    private ReminderRule reminder(String title, String date, boolean enabled) {
        ReminderRule rule = new ReminderRule();
        rule.setTitle(title);
        rule.setNextReminderDate(date);
        rule.setIntervalDays(14);
        rule.setEnabled(enabled);
        return rule;
    }
}
