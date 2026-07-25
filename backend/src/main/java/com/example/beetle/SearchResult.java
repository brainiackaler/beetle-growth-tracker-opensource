package com.example.beetle;

public class SearchResult {
    private String id;
    // For records that belong to a beetle, we also return the beetleId so frontend can navigate
    private String beetleId;

    // Type of record: "BEETLE", "GROWTH", "PRODUCTION", "COST"
    private String type;

    private String title;
    private String subtitle;
    private String date;

    public SearchResult(String id, String beetleId, String type, String title, String subtitle, String date) {
        this.id = id;
        this.beetleId = beetleId;
        this.type = type;
        this.title = title;
        this.subtitle = subtitle;
        this.date = date;
    }

    public String getId() { return id; }
    public String getBeetleId() { return beetleId; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getSubtitle() { return subtitle; }
    public String getDate() { return date; }
}
