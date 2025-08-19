#!/usr/bin/env tsx

/**
 * Script to analyze production errors and auto-fix patterns
 * Run with: npm run analyze:errors
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function analyzeErrors(daysBack: number = 7) {
  console.log(`\n📊 Analyzing errors from last ${daysBack} days...\n`);

  // 1. Get all error messages
  const errorMessages = await sql(
    `SELECT 
      DATE("createdAt") as day,
      substring(content, 1, 300) as error_content,
      status,
      COUNT(*) as occurrences
    FROM "bazaar-vid_message"
    WHERE "createdAt" > NOW() - INTERVAL '${daysBack} days'
      AND role = 'assistant'
      AND (
        content LIKE '%error%' 
        OR content LIKE '%Error%'
        OR content LIKE '%fix%'
        OR content LIKE '%Fix%'
        OR content LIKE '%FIX%'
        OR content LIKE '%failed%'
        OR content LIKE '%undefined%'
        OR content LIKE '%is not defined%'
        OR content LIKE '%Unexpected token%'
      )
    GROUP BY DATE("createdAt"), substring(content, 1, 300), status
    ORDER BY day DESC, occurrences DESC`
  );

  console.log('🔴 ERROR PATTERNS FOUND:\n');
  console.log('='.repeat(80));
  
  // Group by error type
  const errorPatterns: Record<string, number> = {};
  const errorExamples: Record<string, string[]> = {};
  
  for (const row of errorMessages) {
    const content = row.error_content;
    
    // Categorize errors
    let category = 'Other';
    
    if (content.includes('is not defined')) {
      const match = content.match(/(\w+) is not defined/);
      category = match ? `"${match[1]}" is not defined` : 'Variable not defined';
    } else if (content.includes('fps') && content.includes('undefined')) {
      category = 'FPS undefined error';
    } else if (content.includes('Unexpected token')) {
      category = 'Syntax error (Unexpected token)';
    } else if (content.includes('currentFrame')) {
      category = 'currentFrame naming issue';
    } else if (content.includes('FIX BROKEN SCENE')) {
      category = 'Auto-fix triggered';
    } else if (content.includes('Fixing') || content.includes('fixing')) {
      category = 'Manual fix attempt';
    } else if (content.includes('x is not defined')) {
      category = 'Mysterious "x" variable error';
    }
    
    errorPatterns[category] = (errorPatterns[category] || 0) + Number(row.occurrences);
    
    if (!errorExamples[category]) {
      errorExamples[category] = [];
    }
    if (errorExamples[category].length < 3) {
      errorExamples[category].push(content.substring(0, 150) + '...');
    }
  }
  
  // Sort by frequency
  const sortedErrors = Object.entries(errorPatterns)
    .sort(([, a], [, b]) => b - a);
  
  for (const [category, count] of sortedErrors) {
    console.log(`\n📍 ${category}: ${count} occurrences`);
    console.log('   Examples:');
    errorExamples[category]?.forEach(ex => {
      console.log(`   - ${ex}`);
    });
  }

  // 2. Analyze auto-fix patterns
  console.log('\n\n🔧 AUTO-FIX ANALYSIS:\n');
  console.log('='.repeat(80));
  
  const autoFixStats = await sql(
    `SELECT 
      DATE("createdAt") as day,
      COUNT(*) as total_messages,
      COUNT(CASE WHEN content LIKE '%FIX BROKEN SCENE%' THEN 1 END) as auto_fixes,
      COUNT(CASE WHEN content LIKE '%Fixing%' OR content LIKE '%fixing%' THEN 1 END) as manual_fixes,
      COUNT(CASE WHEN content LIKE '%Reverted scene%' THEN 1 END) as reverts
    FROM "bazaar-vid_message"
    WHERE "createdAt" > NOW() - INTERVAL '${daysBack} days'
      AND role = 'assistant'
    GROUP BY DATE("createdAt")
    ORDER BY day DESC`
  );
  
  console.log('Day         | Total Msgs | Auto-Fixes | Manual Fixes | Reverts | Fix Rate');
  console.log('-'.repeat(80));
  
  let totalMessages = 0;
  let totalAutoFixes = 0;
  let totalManualFixes = 0;
  let totalReverts = 0;
  
  for (const row of autoFixStats) {
    const fixRate = ((row.auto_fixes + row.manual_fixes) / row.total_messages * 100).toFixed(1);
    console.log(
      `${row.day.toISOString().split('T')[0]} | ${String(row.total_messages).padStart(10)} | ${String(row.auto_fixes).padStart(10)} | ${String(row.manual_fixes).padStart(12)} | ${String(row.reverts).padStart(7)} | ${fixRate.padStart(7)}%`
    );
    
    totalMessages += Number(row.total_messages);
    totalAutoFixes += Number(row.auto_fixes);
    totalManualFixes += Number(row.manual_fixes);
    totalReverts += Number(row.reverts);
  }
  
  console.log('-'.repeat(80));
  const totalFixRate = ((totalAutoFixes + totalManualFixes) / totalMessages * 100).toFixed(1);
  console.log(
    `TOTAL      | ${String(totalMessages).padStart(10)} | ${String(totalAutoFixes).padStart(10)} | ${String(totalManualFixes).padStart(12)} | ${String(totalReverts).padStart(7)} | ${totalFixRate.padStart(7)}%`
  );

  // 3. Look for "x" prefix pattern
  console.log('\n\n🔍 MYSTERIOUS "X" PREFIX ANALYSIS:\n');
  console.log('='.repeat(80));
  
  const xErrors = await sql(
    `SELECT 
      "createdAt",
      substring(content, 1, 200) as content
    FROM "bazaar-vid_message"
    WHERE "createdAt" > NOW() - INTERVAL '${daysBack} days'
      AND (
        content LIKE '%x is not defined%'
        OR content LIKE '%"x" prefix%'
        OR content LIKE '%mysterious%'
      )
    ORDER BY "createdAt" DESC
    LIMIT 20`
  );
  
  if (xErrors.length > 0) {
    console.log(`Found ${xErrors.length} instances of "x" related errors:\n`);
    for (const row of xErrors) {
      console.log(`${row.createdAt.toISOString()}: ${row.content}`);
    }
  } else {
    console.log('No "x" prefix errors found in messages (might be fixed silently)');
  }

  // 4. Most problematic scenes
  console.log('\n\n💥 MOST PROBLEMATIC PROJECTS (by error count):\n');
  console.log('='.repeat(80));
  
  const problematicProjects = await sql(
    `SELECT 
      m."projectId",
      COUNT(*) as error_count,
      COUNT(DISTINCT DATE(m."createdAt")) as days_with_errors
    FROM "bazaar-vid_message" m
    WHERE m."createdAt" > NOW() - INTERVAL '${daysBack} days'
      AND m.role = 'assistant'
      AND (
        m.content LIKE '%error%' 
        OR m.content LIKE '%fix%'
        OR m.content LIKE '%failed%'
      )
    GROUP BY m."projectId"
    ORDER BY error_count DESC
    LIMIT 10`
  );
  
  console.log('Project ID                           | Errors | Days with Errors');
  console.log('-'.repeat(80));
  for (const row of problematicProjects) {
    console.log(`${row.projectId} | ${String(row.error_count).padStart(6)} | ${String(row.days_with_errors).padStart(16)}`);
  }

  // 5. Success vs Failure rate
  console.log('\n\n📈 SUCCESS VS FAILURE RATE:\n');
  console.log('='.repeat(80));
  
  const successRate = await sql(
    `SELECT 
      DATE("createdAt") as day,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
      ROUND(COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric * 100 / NULLIF(COUNT(*), 0), 2) as success_rate
    FROM "bazaar-vid_message"
    WHERE "createdAt" > NOW() - INTERVAL '${daysBack} days'
      AND role = 'assistant'
      AND status IS NOT NULL
    GROUP BY DATE("createdAt")
    ORDER BY day DESC`
  );
  
  console.log('Day         | Total | Success | Errors | Success Rate');
  console.log('-'.repeat(60));
  for (const row of successRate) {
    console.log(
      `${row.day.toISOString().split('T')[0]} | ${String(row.total).padStart(5)} | ${String(row.success).padStart(7)} | ${String(row.errors).padStart(6)} | ${row.success_rate}%`
    );
  }
}

// Run the analysis
analyzeErrors(parseInt(process.argv[2]) || 7)
  .then(() => {
    console.log('\n✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error running analysis:', err);
    process.exit(1);
  });