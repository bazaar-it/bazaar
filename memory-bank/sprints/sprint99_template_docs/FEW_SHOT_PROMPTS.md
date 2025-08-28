# Few-Shot Prompts for Code Generator V2

These are the crafted user prompts for each template example in the conversational few-shot learning system.

## Example 1: Corporate Credit Card
**User Prompt:** "Create a corporate credit card showcase with expense categories appearing around it, some approved and some rejected"

**Why this prompt works:**
- Natural language that a real user would use
- Describes the main element (credit card) and supporting animations
- Mentions specific behavior (approved/rejected) without being overly technical
- Leaves room for creative interpretation while being specific enough

## Example 2: Message Notification
**User Prompt:** "Show a message notification popping up with a smooth animation, like a chat app notification"

**Why this prompt works:**
- References familiar UI pattern (chat app)
- Mentions animation quality expectation (smooth)
- Simple and straightforward request
- Relates to common user experience

## Example 3: UI Data Visualization
**User Prompt:** "Create a modern data visualization dashboard with animated charts and metrics"

**Why this prompt works:**
- Uses trending terminology (modern, dashboard)
- Broad enough to showcase multiple elements
- Emphasizes animation as key feature
- Common request for SaaS products

## Example 4: Google Sign-In
**User Prompt:** "Design a Google sign-in button with the official Google branding and a nice hover effect"

**Why this prompt works:**
- Specific brand requirement (Google)
- Mentions interaction (hover effect)
- Clear single-purpose component
- Common authentication pattern

## Example 5: Bar Chart
**User Prompt:** "Create an animated bar chart showing data growing over time with smooth transitions"

**Why this prompt works:**
- Specific visualization type (bar chart)
- Describes the animation behavior (growing over time)
- Quality descriptor (smooth transitions)
- Common data visualization need

## Example 6: Customer Testimonials
**User Prompt:** "Show customer testimonials sliding in one by one with profile pictures and quotes"

**Why this prompt works:**
- Clear content type (testimonials)
- Specific animation pattern (sliding in one by one)
- Mentions key elements (profile pictures, quotes)
- Social proof pattern common in marketing

## Example 7: Mobile Notifications
**User Prompt:** "Display mobile app notifications stacking up on a home screen"

**Why this prompt works:**
- Mobile-specific context
- Clear animation behavior (stacking up)
- Familiar UI pattern (home screen notifications)
- Simple yet specific request

## Alternative Prompts for A/B Testing

### Finance/Vibes Theme
1. "Create a finance app dashboard with a modern gradient background and key metrics animating in"
2. "Show a sleek credit card with transaction history flowing around it"
3. "Design a stock price chart with real-time updates and smooth animations"

### Social/Engagement Theme
1. "Build a social media feed with posts appearing one by one"
2. "Create a like counter that animates up with heart particles"
3. "Show user avatars joining a video call with smooth entrance animations"

### Data/Analytics Theme
1. "Display a pie chart breaking apart to show individual segments"
2. "Create a line graph drawing itself over time with data points pulsing"
3. "Show KPI cards flipping to reveal updated numbers"

### UI Components Theme
1. "Design a pricing card with features checking off one by one"
2. "Create a loading spinner that morphs into a success checkmark"
3. "Show a navigation menu sliding in from the side with staggered items"

## Testing Strategy

For A/B testing the few-shot system:

1. **Control Group**: Use current system prompt without examples
2. **Test Group A**: Use 3 examples (minimal set)
3. **Test Group B**: Use 5 examples (balanced set)
4. **Test Group C**: Use all 7 examples (comprehensive set)

### Metrics to Track:
- Code quality score (does it compile, follow patterns)
- Animation smoothness (spring usage, timing)
- Visual appeal (colors, layout, typography)
- Adherence to format (proper exports, naming conventions)
- Generation speed (time to complete)
- Token usage (efficiency)

## Implementation Notes

The prompts are designed to:
- Sound like natural user requests
- Cover diverse use cases
- Avoid technical jargon
- Be specific enough to guide but vague enough to allow creativity
- Match real-world Bazaar.it user needs

These prompts can be rotated or customized based on:
- User's industry (finance, SaaS, e-commerce, etc.)
- Video format (landscape, portrait, square)
- Complexity level (simple, intermediate, advanced)
- Brand style (corporate, playful, minimal)