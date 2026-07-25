package com.example.beetle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramWebhookControllerTest {
    @Mock
    private TelegramBindingService telegramBindingService;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    @Mock
    private TelegramCommandService telegramCommandService;

    private TelegramWebhookController controller;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        controller = new TelegramWebhookController(
                telegramBindingService,
                telegramCommandService,
                telegramNotificationService,
                "webhook-secret"
        );
        objectMapper = new ObjectMapper();
    }

    @Test
    void validStartMessageBindsAccountAndReplies() throws Exception {
        String token = "abcdefghijklmnop";
        JsonNode update = objectMapper.readTree("{"
                + "\"message\":{"
                + "\"text\":\"/start " + token + "\","
                + "\"chat\":{\"id\":123456789,\"type\":\"private\"},"
                + "\"from\":{\"username\":\"beetle_owner\",\"first_name\":\"甲虫\",\"last_name\":\"主人\"}"
                + "}}");
        when(telegramBindingService.bind(
                token,
                "123456789",
                "beetle_owner",
                "甲虫",
                "主人"
        )).thenReturn(TelegramBindingService.BindResult.success("绑定成功"));

        Map<String, Boolean> response = controller.receive("webhook-secret", update);

        assertTrue(response.get("ok"));
        verify(telegramNotificationService).sendMessage("123456789", "绑定成功");
    }

    @Test
    void invalidWebhookSecretIsRejected() {
        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.receive("wrong-secret", null)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
    }

    @Test
    void remindersCommandRepliesWithCommandServiceResult() throws Exception {
        JsonNode update = objectMapper.readTree("{"
                + "\"message\":{"
                + "\"text\":\"/reminders\","
                + "\"chat\":{\"id\":123456789,\"type\":\"private\"}"
                + "}}");
        when(telegramCommandService.handle("123456789", "reminders"))
                .thenReturn("近期提醒");

        Map<String, Boolean> response = controller.receive("webhook-secret", update);

        assertTrue(response.get("ok"));
        verify(telegramNotificationService).sendMessage("123456789", "近期提醒");
    }

    @Test
    void startWithoutTokenShowsBoundAwareHelp() throws Exception {
        JsonNode update = objectMapper.readTree("{"
                + "\"message\":{"
                + "\"text\":\"/start\","
                + "\"chat\":{\"id\":123456789,\"type\":\"private\"}"
                + "}}");
        when(telegramCommandService.handleStart("123456789")).thenReturn("已绑定");

        controller.receive("webhook-secret", update);

        verify(telegramNotificationService).sendMessage("123456789", "已绑定");
    }
}
