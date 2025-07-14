# Cost Analysis for Credit Pricing

## API & Infrastructure Costs

### OpenAI Costs
```
GPT-4o-mini: $0.150 / 1M input tokens, $0.600 / 1M output tokens
Average generation: ~500 input + 2000 output tokens
Cost per generation: ~$0.0015 (rounds to $0.002)
```

### AWS Lambda Rendering Costs
Based on Remotion Lambda pricing:
```
720p (30 seconds):
- Lambda compute: ~$0.05
- S3 storage: ~$0.01
- Bandwidth: ~$0.02
- Total: ~$0.08

1080p (30 seconds):
- Lambda compute: ~$0.10
- S3 storage: ~$0.02
- Bandwidth: ~$0.03
- Total: ~$0.15

4K (30 seconds):
- Lambda compute: ~$0.30
- S3 storage: ~$0.05
- Bandwidth: ~$0.05
- Total: ~$0.40
```

### Storage Costs (R2)
```
Storage: $0.015 per GB per month
Bandwidth: Free (R2 advantage)
Average video size: 
- 1080p 30s: ~30MB
- 4K 30s: ~100MB
```

## Credit Pricing Strategy

### Base Credit Rate
$15 for 1,500 credits = $0.01 per credit

### Usage Examples

#### 30-second 1080p Video
```
User Cost:
- AI Generation: 10 credits ($0.10)
- Video Render: 60 credits ($0.60)
- Total: 70 credits ($0.70)

Our Cost:
- AI Generation: $0.002
- Video Render: $0.15
- Storage: ~$0.001
- Total: ~$0.153

Margin: $0.547 (78% margin)
```

#### 60-second 1080p Video
```
User Cost:
- AI Generation: 10 credits ($0.10)
- Video Render: 120 credits ($1.20)
- Total: 130 credits ($1.30)

Our Cost:
- AI Generation: $0.002
- Video Render: $0.30
- Storage: ~$0.002
- Total: ~$0.304

Margin: $0.996 (76% margin)
```

#### 60-second 4K Video
```
User Cost:
- AI Generation: 10 credits ($0.10)
- Video Render: 300 credits ($3.00)
- Total: 310 credits ($3.10)

Our Cost:
- AI Generation: $0.002
- Video Render: $0.80
- Storage: ~$0.01
- Total: ~$0.812

Margin: $2.288 (74% margin)
```

## Bulk Purchase Incentives

### Package Structure
```
$15 → 1,500 credits (base rate: $0.01/credit)
$50 → 5,500 credits (10% bonus: $0.0091/credit)
$100 → 12,000 credits (20% bonus: $0.0083/credit)
$250 → 32,500 credits (30% bonus: $0.0077/credit)
```

### Margin Analysis by Package
Even with bulk discounts, margins remain healthy:
- Base package: 74-78% margin
- 10% bonus: 71-75% margin
- 20% bonus: 68-72% margin
- 30% bonus: 65-69% margin

## Break-Even Analysis

### Per Video Type
```
720p 30s: Need to charge at least 8 credits to break even
1080p 30s: Need to charge at least 15 credits to break even
4K 30s: Need to charge at least 40 credits to break even
```

### Monthly User Value
```
Light User (5 videos/month @ 1080p 30s):
- Revenue: 350 credits ($3.50)
- Cost: ~$0.77
- Profit: $2.73

Average User (20 videos/month @ 1080p 30s):
- Revenue: 1,400 credits ($14.00)
- Cost: ~$3.06
- Profit: $10.94

Heavy User (50 videos/month @ mixed quality):
- Revenue: 4,000 credits ($40.00)
- Cost: ~$8.50
- Profit: $31.50
```

## Competitive Analysis

### vs. Subscription Models
```
Runway ML: $15/month for limited usage
Canva: $12.99/month with export limits
Our Model: Pay only for what you use
```

### Value Proposition
- 30s 1080p video = $0.70 (70 credits)
- Competitor subscription = $15/month
- Users need 21+ videos to match subscription value
- Most users won't hit this threshold

## Recommendations

1. **Starting Prices**: Current structure provides excellent margins (70%+)
2. **Free Credits**: 100 credits for new users = ~$1.50 cost, good for acquisition
3. **Bulk Discounts**: Even 30% bonus maintains 65%+ margins
4. **Future Adjustments**: Can lower prices as we scale and costs decrease

## Risk Factors

1. **Rendering Costs**: May increase with complexity
2. **Storage Growth**: Long-term storage costs could accumulate
3. **Support Costs**: Not factored into current analysis
4. **Refunds**: Need policy for unused credits

## Conclusion

The credit model with current pricing:
- Maintains 70%+ margins on average
- Provides clear value vs. competitors
- Scales with usage
- Simple for users to understand
- Allows flexible pricing adjustments