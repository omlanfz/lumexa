// FILE PATH: server/src/assessments/bank/final-tests/python-foundations-path.ts
//
// Python Foundations — Final Test: 25 MCQ + 5 True/False drawn from the program's three
// courses (Python Programming Essentials, Problem Solving & Program Design, Python Tools &
// Data Foundations) plus one ~15-minute Python project the teacher marks.

import { composeBank, project } from '../bank.helpers';
import { problemSolvingProgramDesignExtras } from '../course-tests/problem-solving-program-design';
import { pythonProgrammingEssentialsExtras } from '../course-tests/python-programming-essentials';
import { pythonToolsDataFoundationsExtras } from '../course-tests/python-tools-data-foundations';

export const pythonFoundationsFinal = composeBank({
  id: 'final-test/python-foundations-path',
  title: 'Python Foundations — Final Test',
  type: 'FINAL_TEST',
  slices: [
    pythonProgrammingEssentialsExtras.final,
    problemSolvingProgramDesignExtras.final,
    pythonToolsDataFoundationsExtras.final,
  ],
  codingProject: project({
    key: 'P01',
    title: 'Mission Log Analyser',
    language: 'python',
    instructions: `You are writing a small analysis tool for a space agency's mission log. You have about 15 minutes. The starter code stores the missions as a list of dictionaries (one of them has no "days" value). Write code that:

1. Defines average_duration(missions), which RETURNS the average number of days of the missions that have a "days" value (0 for an empty list).
2. Defines count_by_status(missions), which RETURNS a dictionary that counts how many missions have each status, for example {"complete": 2, "failed": 1}. Every mission counts here, even one with no "days" value.
3. Defines longest_mission(missions), which RETURNS the name of the mission with the most days (None if there is no mission with a "days" value).
4. Skips a mission that has no "days" value instead of crashing the program.
5. Prints a short report with the number of missions, the average duration to one decimal place, the counts by status and the name of the longest mission.

Use functions that return their results (do not print inside them), clear names and short comments.`,
    starterCode: `missions = [
    {"name": "Apollo-X", "days": 12, "status": "complete"},
    {"name": "Lunar-3", "days": 30, "status": "complete"},
    {"name": "Mars-Scout", "days": 210, "status": "active"},
    {"name": "Deep-Look", "days": 45, "status": "failed"},
    {"name": "Star-Ferry", "days": 90, "status": "active"},
    {"name": "Probe-9", "status": "active"},  # no "days" value recorded
]


# 1. average_duration(missions)


# 2. count_by_status(missions)


# 3. longest_mission(missions)


# 4 and 5. Call the functions and print the report
`,
    rubric: [
      {
        criterion: 'Functions that return values',
        maxPoints: 6,
        lookFor:
          'All three functions are defined and RETURN their results rather than printing them. With the starter data average_duration gives 77.4, count_by_status gives 2 complete, 3 active and 1 failed, and longest_mission gives "Mars-Scout".',
      },
      {
        criterion: 'Loops and collections',
        maxPoints: 5,
        lookFor:
          'Loops over the list of dictionaries, reads values by key, builds the counts in a dictionary (for example counts[status] = counts.get(status, 0) + 1) and keeps a running maximum correctly.',
      },
      {
        criterion: 'Edge cases and safety',
        maxPoints: 5,
        lookFor:
          'The mission with no "days" value is skipped (with .get, an if check or try and except) so nothing crashes and it does not change the average. An empty list gives 0, an empty dictionary and None.',
      },
      {
        criterion: 'Readability and output',
        maxPoints: 4,
        lookFor:
          'Prints all four report items clearly with f-strings (the average shown as 77.4), uses meaningful names and short comments, and the program would run as written. Award full marks only if it runs.',
      },
    ],
  }),
});
