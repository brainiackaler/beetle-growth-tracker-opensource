package com.example.beetle;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 成本和收入记录实体类
 * 用于记录甲虫养殖过程中的花费（如木屑、果冻）以及收入（如售出）
 */
@Entity
public class CostRecord {
    @Id
    private String id;

    // 记录类型：EXPENSE (支出), INCOME (收入)
    private String type;

    // 分类：如 WOOD_CHIPS (木屑), JELLY (果冻), SALE (售出), OTHER (其他)
    private String category;

    // 所属批次
    private String batchName;

    // 金额
    private Double amount;

    // 记录日期 (YYYY-MM-DD)
    private String recordDate;

    // 详细说明或备注
    @Column(length = 1000)
    private String description;

    // 甲虫名称（售出时记录）
    private String beetleName;

    // 甲虫品种（售出时记录）
    private String beetleSpecies;

    // 相关照片链接（多图用逗号分隔）
    @Column(length = 2000)
    private String imageUrls;

    // 虫态 (成虫, 幼虫)
    private String beetleStage;

    // 性别 (公虫, 母虫, 未辨识)
    private String beetleGender;

    // 尺寸/体重
    private String beetleSize;

    // 龄期 (L1, L2, L3)
    private String beetleInstar;

    // 多只甲虫的JSON信息
    @Column(length = 5000)
    private String beetlesInfo;

    // 创建时间
    private String createdAt;

    @Column(name = "user_id")
    private Long userId;

    @PrePersist
    public void prePersist() {
        if (id == null || id.trim().isEmpty()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = clean(type); }

    public String getBatchName() { return batchName; }
    public void setBatchName(String batchName) { this.batchName = clean(batchName); }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = clean(category); }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getRecordDate() { return recordDate; }
    public void setRecordDate(String recordDate) { this.recordDate = clean(recordDate); }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = clean(description); }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getBeetleName() { return beetleName; }
    public void setBeetleName(String beetleName) { this.beetleName = clean(beetleName); }

    public String getBeetleSpecies() { return beetleSpecies; }
    public void setBeetleSpecies(String beetleSpecies) { this.beetleSpecies = clean(beetleSpecies); }

    public String getImageUrls() { return imageUrls; }
    public void setImageUrls(String imageUrls) { this.imageUrls = clean(imageUrls); }

    public String getBeetleStage() { return beetleStage; }
    public void setBeetleStage(String beetleStage) { this.beetleStage = clean(beetleStage); }

    public String getBeetleGender() { return beetleGender; }
    public void setBeetleGender(String beetleGender) { this.beetleGender = clean(beetleGender); }

    public String getBeetleSize() { return beetleSize; }
    public void setBeetleSize(String beetleSize) { this.beetleSize = clean(beetleSize); }

    public String getBeetleInstar() { return beetleInstar; }
    public void setBeetleInstar(String beetleInstar) { this.beetleInstar = clean(beetleInstar); }

    public String getBeetlesInfo() { return beetlesInfo; }
    public void setBeetlesInfo(String beetlesInfo) { this.beetlesInfo = clean(beetlesInfo); }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
