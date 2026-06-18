package com.example.beetle;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class FileController {

    private final String UPLOAD_DIR = "./data/uploads/";

    @Value("${storage.supabase.url:}")
    private String supabaseUrl;

    @Value("${storage.supabase.bucket:}")
    private String supabaseBucket;

    @Value("${storage.supabase.key:}")
    private String supabaseKey;

    @PostMapping("/upload")
    public Map<String, String> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return Collections.singletonMap("error", "Empty file");
        }

        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String newFileName = UUID.randomUUID().toString() + extension;

        // Check if Supabase configuration is present
        if (supabaseUrl != null && !supabaseUrl.trim().isEmpty() && 
            supabaseBucket != null && !supabaseBucket.trim().isEmpty() && 
            supabaseKey != null && !supabaseKey.trim().isEmpty()) {
            
            try {
                String publicUrl = uploadToSupabase(file.getBytes(), newFileName, file.getContentType());
                return Collections.singletonMap("url", publicUrl);
            } catch (Exception e) {
                e.printStackTrace();
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cloud upload failed: " + e.getMessage());
            }
        }

        // Fallback to local storage
        try {
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            Path path = Paths.get(UPLOAD_DIR + newFileName);
            Files.write(path, file.getBytes());

            return Collections.singletonMap("url", "/uploads/" + newFileName);
        } catch (IOException e) {
            e.printStackTrace();
            return Collections.singletonMap("error", "Upload failed: " + e.getMessage());
        }
    }

    private String uploadToSupabase(byte[] bytes, String fileName, String contentType) throws Exception {
        String baseUrl = supabaseUrl.trim();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        
        String uploadUrlStr = baseUrl + "/storage/v1/object/" + supabaseBucket.trim() + "/" + fileName;
        URL url = new URL(uploadUrlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("apikey", supabaseKey.trim());
        conn.setRequestProperty("Authorization", "Bearer " + supabaseKey.trim());
        conn.setRequestProperty("Content-Type", contentType != null ? contentType : "image/jpeg");
        conn.setRequestProperty("Content-Length", String.valueOf(bytes.length));

        try (OutputStream os = conn.getOutputStream()) {
            os.write(bytes);
            os.flush();
        }

        int responseCode = conn.getResponseCode();
        if (responseCode == 200 || responseCode == 201) {
            return baseUrl + "/storage/v1/object/public/" + supabaseBucket.trim() + "/" + fileName;
        } else {
            String errorMsg = "";
            try (java.io.InputStream es = conn.getErrorStream()) {
                if (es != null) {
                    try (java.util.Scanner s = new java.util.Scanner(es).useDelimiter("\\A")) {
                        errorMsg = s.hasNext() ? s.next() : "";
                    }
                }
            } catch (Exception ignore) {}
            throw new IOException("Supabase responded with code " + responseCode + ": " + errorMsg);
        }
    }
}
