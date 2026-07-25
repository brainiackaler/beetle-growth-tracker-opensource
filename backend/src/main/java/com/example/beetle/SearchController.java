package com.example.beetle;

import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class SearchController {

    private final BeetleRepository beetleRepository;
    private final GrowthRecordRepository growthRecordRepository;
    private final ProductionRecordRepository productionRecordRepository;
    private final CostRecordRepository costRecordRepository;

    public SearchController(BeetleRepository beetleRepository, GrowthRecordRepository growthRecordRepository, ProductionRecordRepository productionRecordRepository, CostRecordRepository costRecordRepository) {
        this.beetleRepository = beetleRepository;
        this.growthRecordRepository = growthRecordRepository;
        this.productionRecordRepository = productionRecordRepository;
        this.costRecordRepository = costRecordRepository;
    }

    private Long getUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    @GetMapping
    public List<SearchResult> search(HttpServletRequest request,
                                     @RequestParam(required = false, defaultValue = "") String keyword,
                                     @RequestParam(required = false, defaultValue = "") String startDate,
                                     @RequestParam(required = false, defaultValue = "") String endDate) {
        Long userId = getUserId(request);
        String kw = keyword.trim().toLowerCase();

        List<SearchResult> results = new ArrayList<>();

        // 1. Fetch Beetles
        List<Beetle> beetles = beetleRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (Beetle b : beetles) {
            boolean match = matchesKeyword(kw, b.getName(), b.getSpecies(), b.getNotes()) &&
                            matchesDate(startDate, endDate, b.getHatchDate(), b.getEmergenceDate(), b.getCreatedAt());
            if (match) {
                results.add(new SearchResult(b.getId(), b.getId(), "BEETLE",
                        b.getName() + " (" + b.getSpecies() + ")",
                        b.getNotes(),
                        b.getHatchDate() != null && !b.getHatchDate().isEmpty() ? b.getHatchDate() : b.getCreatedAt()));
            }
        }

        // Collect beetle IDs to fetch their records
        List<String> beetleIds = beetles.stream().map(Beetle::getId).collect(Collectors.toList());

        if (!beetleIds.isEmpty()) {
            // 2. Fetch Growth Records
            List<GrowthRecord> growthRecords = growthRecordRepository.findByBeetleIdIn(beetleIds);
            for (GrowthRecord g : growthRecords) {
                boolean match = matchesKeyword(kw, g.getStage(), g.getNotes()) &&
                                matchesDate(startDate, endDate, g.getRecordDate(), g.getCreatedAt());
                if (match) {
                    Beetle b = beetles.stream().filter(x -> x.getId().equals(g.getBeetleId())).findFirst().orElse(null);
                    String title = "生长记录 - " + (b != null ? b.getName() : "");
                    results.add(new SearchResult(g.getId(), g.getBeetleId(), "GROWTH", title, g.getStage() + " " + g.getNotes(), g.getRecordDate()));
                }
            }

            // 3. Fetch Production Records
            List<ProductionRecord> prodRecords = productionRecordRepository.findByBeetleIdIn(beetleIds);
            for (ProductionRecord p : prodRecords) {
                boolean match = matchesKeyword(kw, p.getMaleBeetle(), p.getNotes()) &&
                                matchesDate(startDate, endDate, p.getMatingDate(), p.getLayBoxDate(), p.getCreatedAt());
                if (match) {
                    Beetle b = beetles.stream().filter(x -> x.getId().equals(p.getBeetleId())).findFirst().orElse(null);
                    String title = "繁殖记录 - " + (b != null ? b.getName() : "");
                    results.add(new SearchResult(p.getId(), p.getBeetleId(), "PRODUCTION", title, p.getNotes(), p.getMatingDate() != null && !p.getMatingDate().isEmpty() ? p.getMatingDate() : p.getCreatedAt()));
                }
            }
        }

        // 4. Fetch Cost Records
        List<CostRecord> costs = costRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (CostRecord c : costs) {
            boolean match = matchesKeyword(kw, c.getCategory(), c.getDescription(), c.getBeetleName(), c.getBeetleSpecies()) &&
                            matchesDate(startDate, endDate, c.getRecordDate(), c.getCreatedAt());
            if (match) {
                String typeStr = "EXPENSE".equalsIgnoreCase(c.getType()) ? "支出" : "收入";
                String title = "财务记录 (" + typeStr + ") - " + c.getCategory();
                results.add(new SearchResult(c.getId(), null, "COST", title, c.getDescription(), c.getRecordDate()));
            }
        }

        // Sort by date descending
        results.sort((r1, r2) -> {
            String d1 = r1.getDate() != null ? r1.getDate() : "";
            String d2 = r2.getDate() != null ? r2.getDate() : "";
            return d2.compareTo(d1);
        });

        return results;
    }

    private boolean matchesKeyword(String kw, String... fields) {
        if (kw.isEmpty()) return true;
        for (String f : fields) {
            if (f != null && f.toLowerCase().contains(kw)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesDate(String start, String end, String... dates) {
        if ((start == null || start.isEmpty()) && (end == null || end.isEmpty())) return true;

        for (String d : dates) {
            if (d == null || d.trim().isEmpty()) continue;
            // extract YYYY-MM-DD
            String datePart = d.length() >= 10 ? d.substring(0, 10) : d;

            boolean ok = true;
            if (start != null && !start.isEmpty() && datePart.compareTo(start) < 0) ok = false;
            if (end != null && !end.isEmpty() && datePart.compareTo(end) > 0) ok = false;

            if (ok) return true;
        }
        return false;
    }
}
