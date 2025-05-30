import re; content = open("src/server/api/routers/generation.ts").read(); pattern = r"// DISABLED LAST RESORT: wrap entire code

export default function GeneratedComponent\(props\) \{
  \$\{generatedCode\}
\}\`;"; replacement = "// DISABLED LAST RESORT: wrap entire code\n               console.warn(\"Fallback code generation disabled to prevent AbsoluteFill duplication\");"; content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL); open("src/server/api/routers/generation.ts", "w").write(content); print("Fixed!")
