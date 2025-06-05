//memory-bank/DATABASE-SAFETY-STRATEGY.md
# 🛡️ Database Safety Strategy - Never Again Protocol

**Last Updated**: January 17, 2025  
**Triggered By**: Critical data loss incident in Sprint 32  

## 🚨 Core Principle: ZERO TOLERANCE FOR DATA LOSS

After losing 565+ user accounts and all production data, we implement a multi-layered safety approach that makes data loss virtually impossible.

---

## 🔄 CURRENT SAFE STATE ASSESSMENT

### ✅ **What's Working Right Now**
- **Schema**: Correctly using `varchar(255)` for user IDs (NextAuth.js compatible)
- **Manual Updates**: Running SQL directly in editor (safer than broken migrations)
- **No Destructive Migrations**: Avoided the migration system that caused the incident

### ⚠️ **Current Risks**
- **No Backups**: Still no database backups configured
- **Manual Process**: SQL editor updates are error-prone at scale
- **No Testing Environment**: No way to validate changes before production

---

## 🔒 SAFETY LAYERS - Multi-Level Protection

### **Layer 1: Backup Everything (NON-NEGOTIABLE)**

#### **Daily Automated Backups**
```bash
# Setup PostgreSQL automated backups
# Configure your database provider for daily backups with 30-day retention
```

#### **Pre-Change Manual Backup**
```sql
-- BEFORE any schema change, ALWAYS export:
pg_dump -h your-host -U your-user -d your-db > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### **Critical Table Snapshots**
```sql
-- Before ANY user table changes:
CREATE TABLE users_backup_$(date +%Y%m%d) AS SELECT * FROM "bazaar-vid_user";
CREATE TABLE projects_backup_$(date +%Y%m%d) AS SELECT * FROM "bazaar-vid_project";
```

### **Layer 2: Staging Environment (MANDATORY)**

#### **Staging Database Setup**
- **Separate staging database** with production data copy
- **Test ALL migrations** on staging first
- **Verify data preservation** before production deployment

#### **Migration Testing Protocol**
```bash
# 1. Copy production to staging
# 2. Test migration on staging
# 3. Verify data integrity
# 4. Only then apply to production
```

### **Layer 3: Migration Safety Checks**

#### **Pre-Migration Validation Checklist**
- [ ] Backup created and verified
- [ ] Staging test completed successfully
- [ ] Data preservation confirmed
- [ ] Rollback plan documented
- [ ] Team review completed

#### **Migration Code Review Requirements**
- **Two-person approval** for any schema changes
- **Explicit data preservation verification**
- **Rollback script provided**
- **Impact assessment documented**

### **Layer 4: Real-Time Monitoring**

#### **Data Loss Detection**
```sql
-- Monitor critical table row counts
SELECT 
  'users' as table_name, COUNT(*) as row_count FROM "bazaar-vid_user"
UNION ALL
SELECT 
  'projects' as table_name, COUNT(*) as row_count FROM "bazaar-vid_project";
```

#### **Automated Alerts**
- Alert if user count drops by >5%
- Alert if any table becomes empty
- Daily backup verification emails

---

## 🔧 PRACTICAL IMPLEMENTATION PLAN

### **Phase 1: Immediate Safety (This Week)**

#### **Step 1: Backup Setup** ⏰ **URGENT**
```bash
# Configure your database provider for automated backups
# Setup manual backup script for critical changes
```

#### **Step 2: Manual Change Protocol**
```sql
-- For any schema change, follow this exact pattern:

-- 1. BACKUP FIRST
CREATE TABLE backup_table_$(date +%Y%m%d) AS SELECT * FROM original_table;

-- 2. TEST CHANGE (on staging or with limited scope)
-- Your change here

-- 3. VERIFY DATA PRESERVATION
SELECT COUNT(*) FROM original_table; -- Should match expected
SELECT COUNT(*) FROM backup_table_$(date +%Y%m%d); -- Verification

-- 4. DOCUMENT CHANGE
-- Always document what you changed and why
```

### **Phase 2: Migration System Rehabilitation**

#### **Step 1: Audit Current Migrations**
```bash
# Check which migrations exist and their state
ls -la src/server/db/migrations/
```

#### **Step 2: Create Safe Migration Template**
```typescript
// Template for ALL future migrations
import { sql } from "drizzle-orm";
import { db } from "~/server/db";

export async function up() {
  // 1. BACKUP CRITICAL DATA
  await db.execute(sql`
    CREATE TABLE backup_users_${Date.now()} AS 
    SELECT * FROM "bazaar-vid_user"
  `);
  
  // 2. PERFORM CHANGE
  // Your migration here
  
  // 3. VERIFY DATA PRESERVATION
  const beforeCount = await db.execute(sql`SELECT COUNT(*) FROM backup_users_${Date.now()}`);
  const afterCount = await db.execute(sql`SELECT COUNT(*) FROM "bazaar-vid_user"`);
  
  if (beforeCount !== afterCount) {
    throw new Error("DATA LOSS DETECTED - ABORTING MIGRATION");
  }
}

export async function down() {
  // MANDATORY rollback script
}
```

### **Phase 3: Long-term Safety Culture**

#### **Development Workflow Changes**
1. **All schema changes** go through staging first
2. **Mandatory peer review** for any database modifications  
3. **Backup verification** before and after changes
4. **Weekly backup restoration tests**

#### **Team Training**
- Database safety protocols
- Backup and recovery procedures
- Migration best practices
- Incident response procedures

---

## 🚨 EMERGENCY PROTOCOLS

### **If You Suspect Data Loss**
1. **STOP ALL OPERATIONS** immediately
2. **DO NOT** run any more commands
3. Check backup status and restore options
4. Document exactly what happened
5. Restore from most recent backup

### **Before ANY Schema Change**
```bash
# MANDATORY pre-change checklist:
echo "1. Did I create a backup? (Y/N)"
echo "2. Did I test on staging? (Y/N)" 
echo "3. Do I have a rollback plan? (Y/N)"
echo "4. Has this been peer reviewed? (Y/N)"

# Only proceed if ALL answers are Y
```

---

## 📋 CURRENT RECOMMENDED APPROACH

### **For Your Current Situation:**

#### **Option 1: Stay Manual (Safest Short-term)**
- Continue using SQL editor for changes
- Always backup before changes
- Document every change in `/memory-bank/database-changes-log.md`
- Focus on getting automated backups setup first

#### **Option 2: Gradual Migration System Return**
- Setup staging environment first
- Audit and clean existing migrations
- Create new migration template with safety checks
- Test extensively before production use

### **My Recommendation: Option 1 + Backup Setup**
Given the trauma and current working state, I recommend:

1. **Immediately setup automated backups** (highest priority)
2. **Continue manual SQL editor approach** until backups are proven
3. **Create staging environment** in parallel
4. **Return to migrations only** after full safety infrastructure is proven

---

## 🎯 SUCCESS METRICS

### **We've succeeded when:**
- [ ] Automated daily backups running and verified
- [ ] Manual backup process documented and tested
- [ ] Staging environment setup and working
- [ ] Team trained on safety protocols
- [ ] 30 days of successful backup/restore tests completed
- [ ] Migration system rehabilitated with safety checks
- [ ] Zero tolerance culture established

### **Weekly Safety Checklist**
- [ ] Backup verification completed
- [ ] Database health check run
- [ ] No unauthorized schema changes detected
- [ ] Team safety training up to date

---

## 🔗 Related Documentation

- [Critical Data Loss Incident Report](/memory-bank/sprints/sprint32/CRITICAL-DATA-LOSS-INCIDENT.md)
- [Database Changes Log](/memory-bank/database-changes-log.md) (to be created)
- [Backup and Recovery Procedures](/memory-bank/backup-recovery-procedures.md) (to be created)

---

**Remember**: Better to be overly cautious and slightly slower than to lose everything again. Data loss is a career-ending event that we will never allow to happen again.
