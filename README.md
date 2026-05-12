# EduResult — School Result Compiler

A full React.js school result management system modelled on the **Future Pride Model Secondary School** termly report sheet.

---

## 🚀 Getting Started

```bash
cd eduresult
npm install
npm start
```
Opens at **http://localhost:3000**

---

## 🔐 Login Credentials

| Portal  | Credential          |
|---------|---------------------|
| Admin   | Password: `admin123` |
| Teacher | PIN set by admin     |

---

## ✨ Features

### Admin Portal
- Add students with **Admission No., Sex, Term** editable per student
- Add teachers with unique PIN and subject assignment
- Add subjects
- **Assign Staff Roles** — set who is Form Master, House Mistress, Principal
- **Affective & Psychomotor Ratings** — pick A/B/C/D/E for each behaviour row per student
- Lock / Unlock result entry
- Class Results tab with ranked positions, totals, percentages, grades
- **Print Report Sheets** — one A4 page per student matching the Future Pride report sheet:
  - Form Position (position only) and Out of (total students) on separate fields
  - Subject scores with Teacher's Comment and drawn Signature
  - Affective ratings shown with filled grade cells
  - Staff comments (Form Master, House Mistress, Principal)

### Teacher Portal
- PIN-based login — sees only their assigned subject
- Enter **Test 1** (max 20), **Test 2** (max 20), **Exam** (max 60) per student
- Write a **Teacher's Comment** per student
- **Draw their signature** on a canvas pad (finger or mouse)
- If assigned a staff role (Form Master / House Mistress / Principal), a **Staff Comments** tab appears where they can write their comment for every student

---

## 📁 Project Structure

```
src/
├── index.js                         ← React entry point
├── App.jsx                          ← Root: login → admin/teacher routing
├── styles/global.css                ← CSS variables, animations, resets
│
├── context/
│   ├── DBContext.jsx                ← Global DB state (localStorage)
│   └── AuthContext.jsx              ← Login session state
│
├── utils/
│   ├── db.js                        ← localStorage read/write + DB schema
│   ├── grades.js                    ← Grade calc, ranking, score helpers
│   └── useToast.js                  ← Toast notification hook
│
├── components/
│   ├── common/
│   │   ├── Button.jsx / .module.css
│   │   ├── Input.jsx / .module.css
│   │   ├── SelectField.jsx / .module.css
│   │   ├── Card.jsx / .module.css
│   │   ├── Modal.jsx / .module.css
│   │   ├── Toast.jsx / .module.css
│   │   ├── Topbar.jsx / .module.css
│   │   ├── LoginPage.jsx / .module.css
│   │   └── SignaturePad.jsx / .module.css   ← Canvas signature drawing
│   │
│   ├── admin/
│   │   ├── StatsRow.jsx / .module.css
│   │   ├── AdminTabs.jsx / .module.css
│   │   └── ClassResultsTable.jsx / .module.css
│   │
│   └── teacher/
│       ├── StudentCard.jsx / .module.css
│       ├── ScoreEntryForm.jsx / .module.css  ← Scores + comment + signature
│       └── StaffCommentPanel.jsx / .module.css ← Form Master/Mistress/Principal comments
│
└── pages/
    ├── Admin/
    │   ├── AdminPage.jsx            ← Full admin dashboard
    │   └── AdminPage.module.css
    └── Teacher/
        ├── TeacherPage.jsx          ← Student grid + score entry + staff comments
        └── TeacherPage.module.css
```

---

## 🗄️ Database Schema (localStorage)

```js
{
  students: [{ id, name, class }],
  teachers: [{ id, name, subject, pin }],
  subjects: [{ id, name }],
  scores: {                           // scores[studentId][subjectId]
    [studentId]: { [subjectId]: { t1, t2, exam } }
  },
  studentInfo: {                      // set by Admin
    [studentId]: { admNo, sex, term }
  },
  affective: {                        // set by Admin — A/B/C/D/E per behaviour
    [studentId]: { [behaviourRow]: "A"|"B"|"C"|"D"|"E" }
  },
  teacherComments: {                  // set by Teacher
    [studentId]: { [subjectId]: { comment, signature } }
  },
  staffComments: {                    // set by Form Master/Mistress/Principal
    [studentId]: { formMaster, houseMistress, principal }
  },
  roles: { formMaster, houseMistress, principal }, // teacher IDs
  locked: false,
  adminPass: "admin123"
}
```
