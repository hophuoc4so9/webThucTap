# Vietnamese Keyword Filter - Market Trends

## Generic Keywords to Remove

### Từ khóa chung chung (Generic terms)
```javascript
const VIETNAMESE_GENERIC_KEYWORDS = new Set([
  // Education level (appears in almost all)
  "ái học trở lên",       // from high school upward
  "trở lên",              // upward
  "học văn",              // education
  "cấp độ",               // level
  "tốt nghiệp",           // graduate
  "chính quy",            // official/formal
  
  // Experience (generic requirement)
  "kinh nghiệm",          // experience
  "năm kinh nghiệm",      // years of experience
  "dưới 1 năm",           // less than 1 year
  "1 năm",                // 1 year
  "2 năm",                // 2 years
  "3 năm",                // 3 years
  "5 năm",                // 5 years
  "không yêu cầu",        // no requirement
  "có kinh nghiệm",       // with experience
  "không có kinh nghiệm", // no experience
  
  // Demographics (not skills)
  "nữ",                   // female
  "nam",                  // male
  "tuổi",                 // age
  "tuổi 22",              // age 22
  "tuổi 35",              // age 35
  "22 35",                // range 22-35
  
  // Generic requirements
  "yêu cầu",              // requirement
  "không yêu cầu",        // no requirement
  "yêu cầu cao",          // high requirement
  "cơ bản",               // basic
  "nâng cao",             // advanced
  "thành thạo",           // proficient
  "ơ chứa hiểu",          // understand
  
  // Job-related generics
  "vị trí",               // position
  "công việc",            // job
  "việc làm",             // work
  "trách nhiệm",          // responsibility
  "nhiệm vụ",             // task
  "tổ chức",              // organize
  "trung tâm",            // center
  "đại lý",               // agent
  
  // Other generics
  "ưu tiên",              // priority
  "khối ngành",           // industry group
  "chuyên ngành",         // major/specialized
  "lĩnh vực",             // field
  "ngành",                // industry
  "nguồn nhân lực",       // labor
  "nhân lực",             // human resource
  "đạt chuẩn",            // standard/qualified
]);
```

## Valuable Keywords to Keep

### Từ khóa chuyên biệt (Specific/Valuable keywords)
```javascript
// Language Skills
"tieng anh giao tiep",    // English communication
"tieng anh oc hieu",      // English understanding
"tieng anh thanh thao",   // Fluent English
"tieng anh co ban",       // Basic English
"tieng trung",            // Chinese language
"tieng nhat",             // Japanese language
"tieng phap",             // French language

// Communication Skills
"phat am chuan",          // Standard pronunciation
"giao tiep",              // Communication
"giao dien",              // Interface
"dien at troi chay",      // Fluent pronunciation

// Technical/Domain Skills
"kinh te",                // Economics
"tai chinh",              // Finance
"ngan hang",              // Banking
"ngoai thuong",           // Foreign trade
"thuong mai",             // Commerce
"marketing",              // Marketing
"sales",                  // Sales
"ke toan",                // Accounting

// Soft Skills
"tu duy",                 // Thinking/Analytical
"sang tao",               // Creativity
"lap ke hoach",           // Planning
"chi huy",                // Leadership
"phoi hop",               // Collaboration
"dam dam",                // Enthusiasm
"tich cuc",               // Positive attitude
```

## Implementation

### Option 1: Update Backend Filter

**File**: `be/src/services/job-service/services/market-trend.service.ts`

```typescript
const VIETNAMESE_GENERIC_KEYWORDS = new Set([
  // Education
  "ai hoc tro len", "tro len", "hoc van", "cap do", "tot nghiep", "chinh quy",
  // Experience
  "kinh nghiem", "nam kinh nghiem", "duoi 1 nam", "1 nam", "2 nam", "3 nam", "5 nam",
  "khong yeu cau", "co kinh nghiem", "khong co kinh nghiem",
  // Demographics
  "nu", "nam", "tuoi", "tuoi 22", "tuoi 35", "22 35",
  // Generic requirements
  "yeu cau", "khong yeu cau", "yeu cau cao", "co ban", "nang cao", "thanh thao", "oc hieu",
  // Job-related
  "vi tri", "cong viec", "viec lam", "trach nhiem", "niem vu",
  // Other
  "uu tien", "khoi nganh", "chuyen nganh", "linh vuc", "nganh", "dat chuan",
]);

// In buildClusterLabel method - filter generic keywords
private buildClusterLabel(skillSet: Set<string>): string {
  const valuable = Array.from(skillSet)
    .filter(skill => !VIETNAMESE_GENERIC_KEYWORDS.has(skill.toLowerCase()))
    .slice(0, 3);
  
  return valuable.length > 0 ? valuable.join(", ") : "general";
}

// In buildSkillSet method - exclude generic keywords
private buildSkillSet(counts: Map<string, number>, limit: number): Set<string> {
  return new Set(
    Array.from(counts.entries())
      .filter(([skill]) => !VIETNAMESE_GENERIC_KEYWORDS.has(skill.toLowerCase()))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([skill]) => skill),
  );
}
```

### Option 2: Update Skill Extraction

**File**: `be/src/services/job-service/services/market-trend.service.ts`

```typescript
private normalizeSkill(raw: string): string | null {
  const cleaned = this.normalizeKey(raw);
  if (!cleaned) return null;
  
  // Check both SKILL_BLACKLIST and VIETNAMESE_GENERIC_KEYWORDS
  if (SKILL_BLACKLIST.has(cleaned)) return null;
  if (VIETNAMESE_GENERIC_KEYWORDS.has(cleaned)) return null;
  
  return SKILL_ALIASES[cleaned] ?? cleaned;
}
```

### Option 3: Frontend Display Filter

**File**: `fe/src/components/MarketTrend/MarketTrendDashboard.tsx`

```typescript
const DISPLAY_GENERIC_KEYWORDS = new Set([
  "ai hoc tro len", "tro len", "kinh nghiem", "nam", "nu", "tuoi",
  "khong yeu cau", "yeu cau", "co ban", "thanh thao",
]);

// Filter skills before display
const displaySkills = cluster.topSkills.filter(
  skill => !DISPLAY_GENERIC_KEYWORDS.has(skill.toLowerCase())
);

// Display only valuable skills
{displaySkills.slice(0, 4).map(skill => (
  <span key={skill} className="...">
    {skill}
  </span>
))}
```

## Results After Filtering

### Before Filter
```
ai hoc tro len, 2 nam kinh nghiem, nu → (too generic)
1 nam kinh nghiem, ai hoc tro len, tuoi 22 35 → (demographics + generic)
```

### After Filter
```
Cluster 1: phat am chuan, dien at troi chay, tieng anh → (valuable skills!)
Cluster 2: tieng anh giao tiep, tieng anh oc hieu → (language skills)
Cluster 3: kinh te, tai chinh, ngan hang → (finance/banking domain)
```

## Recommendation

I recommend implementing **both Backend + Frontend filtering**:

1. **Backend**: Filter during cluster computation (better performance, affects API)
2. **Frontend**: Filter during display (faster, affects UI only)

### Priority: START WITH FRONTEND
- Instant result without backend deployment
- Easy to test and adjust filter list
- Can always move to backend later

## How to Apply

### Quick Fix (Frontend Only)
1. Update `fe/src/components/MarketTrend/MarketTrendDashboard.tsx`
2. Add filter in the topSkills display
3. Restart frontend dev server

### Complete Fix (Backend + Frontend)
1. Add to backend `SKILL_BLACKLIST` or new `VIETNAMESE_GENERIC_KEYWORDS`
2. Update `buildClusterLabel()` and `buildSkillSet()`
3. Update frontend display filter
4. Rebuild and deploy

## Testing

```javascript
// Test filter
const skills = [
  "ai hoc tro len", "kinh nghiem", "phat am chuan", "tieng anh"
];

const filtered = skills.filter(s => !VIETNAMESE_GENERIC_KEYWORDS.has(s));
console.log(filtered); // ["phat am chuan", "tieng anh"] ✅
```

## Notes

- Adjust the filter list based on actual data
- Keep domain-specific terms (kinh te, tai chinh, etc.)
- Remove demographics and generic requirements
- Balance between filtering and information loss
