package com.example.beetle;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TelegramNotificationServiceTest {

    @Test
    void sendMessageUsesAuthenticatedProxyWhenConfigured() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        TelegramNotificationService service = new TelegramNotificationService(
                new ObjectMapper(),
                "bot-token",
                "beetle_bot",
                "https://example.supabase.co/functions/v1/telegram-proxy",
                "proxy-secret",
                restTemplate
        );

        server.expect(requestTo("https://example.supabase.co/functions/v1/telegram-proxy"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Telegram-Proxy-Secret", "proxy-secret"))
                .andExpect(header("X-Telegram-Bot-Token", "bot-token"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"method\":\"sendMessage\",\"payload\":{\"chat_id\":\"123\",\"text\":\"hello\",\"disable_web_page_preview\":true}}"))
                .andRespond(withSuccess("{\"ok\":true,\"result\":{}}", MediaType.APPLICATION_JSON));

        service.sendMessage("123", "hello");

        server.verify();
    }

    @Test
    void rejectsPartialProxyConfigurationInsteadOfFallingBackToDirectApi() {
        TelegramNotificationService service = new TelegramNotificationService(
                new ObjectMapper(),
                "bot-token",
                "beetle_bot",
                "https://example.supabase.co/functions/v1/telegram-proxy",
                "",
                new RestTemplate()
        );

        assertThrows(IllegalStateException.class, () -> service.sendMessage("123", "hello"));
    }

    @Test
    void registerCommandsPublishesPrivateChatCommandMenu() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        TelegramNotificationService service = new TelegramNotificationService(
                new ObjectMapper(),
                "bot-token",
                "beetle_bot",
                "https://example.supabase.co/functions/v1/telegram-proxy",
                "proxy-secret",
                restTemplate
        );

        server.expect(requestTo("https://example.supabase.co/functions/v1/telegram-proxy"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{"
                        + "\"method\":\"setMyCommands\","
                        + "\"payload\":{"
                        + "\"scope\":{\"type\":\"all_private_chats\"},"
                        + "\"commands\":["
                        + "{\"command\":\"start\",\"description\":\"开始使用或查看绑定状态\"},"
                        + "{\"command\":\"reminders\",\"description\":\"查看近期提醒\"},"
                        + "{\"command\":\"status\",\"description\":\"查看通知状态\"},"
                        + "{\"command\":\"pause\",\"description\":\"暂停 Telegram 通知\"},"
                        + "{\"command\":\"resume\",\"description\":\"恢复 Telegram 通知\"},"
                        + "{\"command\":\"help\",\"description\":\"查看帮助\"}"
                        + "]}}"))
                .andRespond(withSuccess("{\"ok\":true,\"result\":true}", MediaType.APPLICATION_JSON));

        service.registerCommands();

        server.verify();
    }
}
