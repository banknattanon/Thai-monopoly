---
name: systematic-architect-workflow
description: Enforces a highly structured, visual, and user-approved workflow for complex architectural designs, code development, and task execution. Focuses on premium design aesthetics, token-efficient subagent delegation, and safety guardrails.
---

> [!IMPORTANT]
> ## [CORE DIRECTIVE: MUST FOLLOW STRICTLY]
> กฎเหล็ก 3 ข้อนี้ถือเป็นความสำคัญสูงสุดของสกิลนี้ AI Agent จะต้องปฏิบัติตามอย่างเคร่งครัดในทุกกรณี:
>
> 1. **Think Before Act**: ALWAYS explain your step-by-step logic and plan clearly before executing any task or writing code. (ห้ามดำเนินการใด ๆ ก่อนการอธิบายแนวคิดเด็ดขาด)
> 2. **Graphify**: ALWAYS generate a Mermaid.js diagram to visualize the workflow, architecture, or data flow so the user can easily understand it. (ต้องมีแผนภาพประกอบการตัดสินใจเสมอ)
> 3. **Wait for Approval**: PAUSE execution after providing the explanation and diagram. Do NOT proceed, create sub-agents, or run tools until the user explicitly says "Approve". (ต้องหยุดรออนุมัติ ห้ามรันคำสั่ง ห้ามสร้างซับเอเจนต์ หรือแก้ไขไฟล์ใด ๆ จนกว่าจะได้รับคำสั่งอนุมัติ)

---

## 1. Core Concepts & Boundaries

*   **Objective**: เพื่อลดความผิดพลาดในการเขียนโค้ดและช่วยให้ผู้ใช้งานสามารถรีวิวโครงสร้างระบบ (Architecture) และลำดับขั้นตอน (Workflow) ได้ล่วงหน้าผ่านภาพและคำอธิบายที่เป็นขั้นเป็นตอน
*   **Target Scope**: สกิลนี้ครอบคลุมการแก้ไขโครงสร้างโฟลเดอร์, การออกแบบฐานข้อมูล, การสร้าง API, การเขียนโค้ดที่ซับซ้อน และการสั่งใช้งาน Sub-agent ทุกรูปแบบ
*   **System State**: เมื่อเปิดใช้งานสกิลนี้ สถานะแรกรันของ Agent จะต้องเป็น **"Read-Only & Planning Mode"** เท่านั้น

---

## 2. Workflow Phases (ขั้นตอนการทำงาน)

### Phase 1: Planning, Visualization, & Halt (ขั้นสืบค้นและวางผัง)
เมื่อได้รับโจทย์จากผู้ใช้ ให้ปฏิบัติตามคำสั่งหลักดังนี้:
1.  **Analyze**: วิเคราะห์โค้ดหรือสิ่งที่ระบบมีอยู่เดิม โดยใช้เฉพาะเครื่องมือในการอ่าน/สืบค้นเท่านั้น ห้ามแก้ไข
2.  **Explain**: อธิบายขั้นตอนแนวคิดการแก้ปัญหา (Think Before Act) อย่างเป็นระบบ แยกแยะ Task ย่อยที่จะต้องทำ
3.  **Draw**: เขียนไดอะแกรมด้วย **Mermaid.js** (Graphify) เพื่อจำลอง Data Flow หรือ Architecture ของระบบ
4.  **Halt**: หยุดรอการอนุมัติ (Wait for Approval) โดยใช้ข้อความปิดท้ายที่เด่นชัดเพื่อให้ผู้ใช้อนุมัติ

### Phase 2: User Approval Gate (การรับการอนุมัติ)
*   **รอคำสั่งอนุมัติ**: รอให้ผู้ใช้ตอบกลับด้วยคำว่า **"Approve"** (หรือข้อความที่มีเจตจำนงอนุมัติชัดเจน)
*   **หากผู้ใช้ขอปรับแก้**: ย้อนกลับไป Phase 1 ปรับปรุงขั้นตอนและไดอะแกรมใหม่ แล้วหยุดรอการอนุมัติอีกครั้ง

### Phase 3: Safe Execution (การลงมือทำอย่างปลอดภัย)
*   เมื่อผ่านด่านการอนุมัติแล้วเท่านั้น จึงจะสามารถเริ่มใช้เครื่องมือในการแก้ไขไฟล์ (เช่น `replace_file_content` หรือ `write_to_file`) รันคำสั่งควบคุม หรือเรียกใช้ Sub-agent ได้
*   เขียนบันทึกความคืบหน้าลงในไฟล์ `task.md` (หากอยู่ใน Planning Mode)

### Phase 4: Final Verification (การตรวจสอบขั้นสุดท้าย)
*   รัน Linter, Run Test หรือจำลองพฤติกรรมเพื่อตรวจสอบผลลัพธ์
*   สรุปผลการทำงานให้ผู้ใช้งานทราบหลังจากตรวจสอบเสร็จสิ้น

---

## 3. Subagent Orchestration Protocol (ข้อตกลงการใช้งานเอเจนต์ย่อย)

เพื่อควบคุมประสิทธิภาพและหลีกเลี่ยงการทับซ้อนของข้อมูล (Context Clutter) การใช้งาน Subagent จะต้องปฏิบัติตามโครงสร้างนี้อย่างเคร่งครัด:

### 3.1 เงื่อนไขการสร้าง Subagent (Pre-requisites)
1.  **Approval Gate**: ห้ามเปิดใช้ Subagent ใด ๆ จนกว่าจะผ่านขั้นตอนการอนุมัติแผนงานจากผู้ใช้ใน Phase 2 แล้วเท่านั้น
2.  **Explicit Responsibility**: ก่อนส่งงานให้ Subagent ต้องกำหนด **Role** (บทบาท) และ **Prompt** (คำสั่ง) ที่มีกรอบขอบเขตชัดเจน (Single Responsibility Principle)
3.  **Workspace Isolation**: พิจารณาเลือกโหมด Workspace ให้เหมาะสม (`inherit`, `branch`, หรือ `share`) ตามความปลอดภัยของโค้ดหลัก

### 3.2 การเลือกประเภท Subagent
เลือกเอเจนต์ให้ตรงกับงานเพื่อประหยัดทรัพยากร:
*   **Research Agent**: ใช้สำหรับงานวิจัยที่ต้องอ่านไฟล์จำนวนมาก, ค้นหา Web Docs หรือสืบค้นฐานข้อมูลขนาดใหญ่ โดยไม่ส่งผลกระทบใด ๆ กับโค้ด
*   **Self Agent**: ใช้เมื่องานต้องการสิทธิ์ในการเขียน/รันคำสั่งในการสร้างโค้ดแบบแยกส่วน (เช่น การสร้าง Test Suite หรือการทำ Boilerplate)

### 3.3 การประสานงานและการควบคุมคุณภาพ (Orchestration & Verification)
1.  **Asynchronous Waiting**: หลังจากส่งงานให้ Subagent แล้ว ให้ปล่อยแอปพลิเคชันเข้าสู่สถานะรอการปลุก (Reactive Wakeup) ห้ามเขียนโค้ดลูปตรวจสถานะ (No Polling)
2.  **Peer Review (Code Review)**: เมื่อ Subagent ทำงานเสร็จส่งผลงานกลับมา ตัว Agent หลักทำหน้าที่เป็น **Senior Reviewer** เสมอ เพื่อตรวจสอบโค้ดก่อนนำมารวมร่าง (Merge)

---

## 4. Premium Visual Design Standards (มาตรฐานงานออกแบบพรีเมียม)

AI จะต้องไม่สร้าง UI ที่ดูจืดชืดหรือมีหน้าตาเหมือนขั้นต่ำสุดของระบบ (Minimum Viable Product) แต่ต้องเน้นความสวยงามระดับพรีเมียม โดยปฏิบัติตามกฎเหล็กการดีไซน์เหล่านี้เสมอ:

### 4.1 Typography (ฟอนต์ระดับมืออาชีพ)
*   **❌ NO DEFAULT FONTS**: ห้ามปล่อยให้เบราว์เซอร์ใช้ฟอนต์ตั้งต้นเด็ดขาด
*   **✅ GOOGLE FONTS**: ต้องนำเข้า (Import) ฟอนต์ระดับพรีเมียมจาก Google Fonts เสมอ เช่น **Inter**, **Plus Jakarta Sans**, **Outfit**, หรือ **Playfair Display**

### 4.2 Color System (ระบบสีและจิตวิทยา)
*   **❌ NO RAW COLORS**: ห้ามใช้สีตั้งต้นแบบดิบ ๆ (เช่น `color: blue;` หรือ `background: red;`)
*   **✅ HARMONIOUS PALETTES**: ใช้ระบบสีที่จับคู่กันอย่างกลมกลืน (เช่น โทนสี HSL ที่คำนวณมาอย่างดี)
*   **✅ SLEEK DARK MODE & GRADIENTS**: เน้นการใช้เฉดสีเทาเข้มผสมโทนเย็น (เช่น Slate, Zinc) แทนสีดำสนิท และใช้ Gradient ที่มีความละเอียดสูงเพื่อเพิ่มมิติ

### 4.3 Glassmorphism & Depth (มิติกระจกและแสงเงา)
*   เพิ่มความลึกและมิติให้แก่หน้าเว็บด้วย **Backdrop Filter (Blur)**, เส้นขอบจาง ๆ (เช่น `rgba(255,255,255,0.05)`) และเงาที่ ฟุ้งกระจาย (Soft, Diffused Shadows) แทนเงาแข็ง ๆ ดำ ๆ

### 4.4 Micro-Animations & Interactivity (การเคลื่อนไหวที่นุ่มนวล)
*   เพิ่มแอนิเมชันขนาดเล็กเพื่อตอบรับการกระทำของผู้ใช้ (User Action): ปุ่ม เมนู หรือการ์ดเนื้อหา ต้องมีเอฟเฟกต์ `:hover` หรือ `:active` ที่นุ่มนวลด้วย `transition: all 0.3s ease;`

### 4.5 Layout & Grid (ความสมดุลและการจัดวาง)
*   จัดวางสัดส่วนหน้าเว็บให้สมดุลและมีการเว้นระยะ (Whitespace) ที่ดีเพื่อให้สายตาได้พัก
*   การวาง Layout ต้องเป็น Responsive (แสดงผลได้สวยงามทั้งคอมพิวเตอร์และมือถือ) ด้วย Flexbox/Grid

---

## 5. Token Optimization & Context Budgeting (การควบคุมขนาด Token)

1.  **Strict Context Boundary**: เมื่อเรียกใช้งาน Subagent ส่งไปเฉพาะส่วนโค้ดที่ต้องการให้ประเมินหรือแก้ไขเท่านั้น ห้ามส่งประวัติการคุยทั้งหมด (History) หรือโค้ดที่ไม่เกี่ยวข้อง
2.  **Format Constraints**: กำหนดให้ Subagent ตอบเฉพาะข้อมูลสั้น ๆ แบบกะทัดรัด (เช่น "Respond in concise markdown, no conversational filler")
3.  **No-Explain Mode for Workers**: ในงานที่เป็นการเขียนโค้ดหรือแก้ไขระบบ บังคับให้ Subagent ส่งกลับเฉพาะ Code Block หรือผลการทดสอบ โดยไม่ต้องบรรยายเหตุผลยืดยาว เว้นแต่จะเกิดข้อผิดพลาด
