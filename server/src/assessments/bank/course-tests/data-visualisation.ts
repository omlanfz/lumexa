// FILE PATH: server/src/assessments/bank/course-tests/data-visualisation.ts
//
// Data Scientist Path → "Data Visualisation" (8 lessons, 3 projects: Climate
// Change Dashboard, Market Trends Chart, Sports Comparison Visualiser).
// Topics: 1 the science of good charts · 2 Matplotlib line/bar/scatter ·
// 3 Seaborn statistical plots · 4 choosing the right chart · 5 colour, labels
// & storytelling · 6 interactive Plotly charts · 7 Dash layouts & callbacks ·
// 8 building a complete dashboard.

import { ModuleExtras, bank, codeOut, mcq, snippet, tf } from '../bank.helpers';

export const dataVisualisation = bank({
  id: 'course-test/data-visualisation',
  title: 'Data Visualisation — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · The science of good charts ───────────────────────────────
    mcq(
      1,
      'According to the perception research in this lesson, which way of encoding a value do people read most accurately?',
      'Position along a common scale',
      ['Area', 'Colour shading', 'Volume'],
      'The ranking from most to least accurate is roughly: position > length > angle/slope > area > colour/shading > volume. That is why line and bar charts dominate good visualisation.',
    ),
    mcq(
      1,
      'Which of these is an explanatory visualisation?',
      'A cleaned-up chart with a headline title, labelled axes and units, made to communicate one insight to an audience',
      [
        'A rough, quick plot drawn to explore the data for yourself',
        'Any chart that uses more than two colours',
        'Any chart that has been saved as an image file',
      ],
      'Exploratory charts are quick and messy and made for yourself; explanatory charts are polished and designed to communicate one clear point to someone else.',
    ),
    mcq(
      1,
      "A bar chart's y-axis starts at 90 instead of 0, so a 2-point difference looks enormous. What is this problem called?",
      'A misleading (truncated) axis',
      ['Chart junk', 'A diverging palette', 'A high data-ink ratio'],
      'A truncated axis exaggerates small differences. Bars should normally start at zero.',
    ),
    mcq(
      1,
      "Which change raises a chart's data-ink ratio?",
      'Removing decoration such as 3D effects and heavy gridlines',
      [
        'Adding a background photograph',
        'Adding more gridlines',
        'Giving every bar a different colour',
      ],
      'The data-ink ratio is the share of the chart\'s "ink" that shows actual data. Decoration lowers it; removing decoration raises it.',
    ),

    // ── Lesson 2 · Matplotlib basics ────────────────────────────────────────
    mcq(
      2,
      "You want to show how a city's temperature changes month by month across a year. Which chart type fits best?",
      'A line plot',
      ['A pie chart', 'A scatter plot with no connecting lines', 'A histogram'],
      'Line plots are best for a continuous, ordered variable (usually time).',
    ),
    mcq(
      2,
      "You have 40 students' study hours and screen time and want to see whether the two are related. Which chart type fits best?",
      'A scatter plot',
      [
        'A pie chart',
        'A line plot over months',
        'A bar chart with one bar per student',
      ],
      'Scatter plots show the relationship between two numeric variables, one point per observation.',
    ),
    mcq(
      2,
      'In `fig, ax = plt.subplots()`, what is `ax`?',
      'A single plot area (Axes) on which you call methods such as `ax.plot()` and `ax.bar()`',
      [
        'Only the x-axis line',
        'The saved image file',
        'The colour palette of the chart',
      ],
      'The Figure is the whole canvas; an Axes is one plot area inside it. (An "axis" is a single x or y line.)',
    ),
    codeOut(
      2,
      'python',
      `import matplotlib.pyplot as plt

fig, ax = plt.subplots()
bars = ax.bar(["Winter", "Spring", "Summer", "Autumn"], [210, 180, 90, 150])
print(len(bars))`,
      '4',
      ['1', '3', '630'],
      'ax.bar draws one bar for each category: four seasons give four bars.',
      'What is printed when this code runs?',
      { requires: ['matplotlib'] },
    ),

    // ── Lesson 3 · Seaborn ──────────────────────────────────────────────────
    mcq(
      3,
      'What does a box plot show?',
      'The median, the interquartile range (the box) and any outliers beyond the whiskers',
      [
        'Only the average value of each group',
        'The correlation between every pair of variables',
        'The count of values in each bin',
      ],
      'A box plot is a compact summary of a distribution, and it is excellent for comparing the spread of several groups side by side.',
    ),
    mcq(
      3,
      'In Seaborn, what does `hue="study_group"` do?',
      'Colours the data by that categorical variable, adding another dimension to the chart',
      [
        'Changes the chart into a pie chart',
        'Sorts the rows alphabetically',
        'Sets the transparency of the figure',
      ],
      'hue splits the data by a category and gives each group its own colour.',
    ),
    mcq(
      3,
      `This is a correlation matrix:\n\n${snippet(
        'text',
        `             quiz_score  hours_slept  screen_time
quiz_score         1.00         0.42        -0.71
hours_slept        0.42         1.00        -0.18
screen_time       -0.71        -0.18         1.00`,
      )}\n\nWhich pair of variables has the strongest relationship?`,
      'quiz_score and screen_time',
      [
        'quiz_score and hours_slept',
        'hours_slept and screen_time',
        'None, because only positive values count',
      ],
      'Strength depends on how far the value is from zero, not on its sign: −0.71 is stronger than 0.42 or −0.18. A strong negative relationship is still a real relationship.',
    ),
    mcq(
      3,
      'What happens if a histogram uses far too many bins?',
      'It becomes noisy and hides the overall shape of the distribution',
      [
        'It becomes smoother and more accurate',
        'It can no longer show outliers',
        'It is coloured by group automatically',
      ],
      'Too many bins make every bar tiny and jagged; too few hide real structure. Try a few different values.',
    ),

    // ── Lesson 4 · Choosing the right chart ─────────────────────────────────
    codeOut(
      4,
      'python',
      `def recommend_chart(goal):
    if goal == "trend over time":
        return "line chart"
    if goal == "relationship":
        return "scatter plot"
    if goal == "compare categories":
        return "bar chart"
    return "histogram"

print(recommend_chart("relationship"), "|", recommend_chart("distribution"))`,
      'scatter plot | histogram',
      [
        'line chart | histogram',
        'scatter plot | bar chart',
        'relationship | distribution',
      ],
      'The first call matches the "relationship" rule. "distribution" matches none of the rules, so the function falls through to its final return.',
      'This function encodes a chart-choice framework. What does the code print?',
    ),
    mcq(
      4,
      'Part-to-whole data has six categories of similar size. Which chart communicates it most clearly?',
      'A sorted horizontal bar chart',
      ['A 3D pie chart', 'A scatter plot', 'A line chart'],
      'People judge length and position much better than angles and areas, so the same data is clearer as sorted bars than as six similar-sized slices.',
    ),
    mcq(
      4,
      'A bar chart of daily temperature across a whole year looks like a "picket fence" of hundreds of bars. What is the better choice?',
      'A line chart, because the variable is continuous time',
      [
        'A pie chart',
        'A bar chart with thicker bars',
        'A box plot of each day',
      ],
      'Bars suit separate categories. A continuous series over time is clearer as a line.',
    ),
    mcq(
      4,
      'Which question is a histogram designed to answer?',
      'How are the values of one numeric variable distributed?',
      [
        'How do two categories compare?',
        'How has a value changed over time?',
        'What share of a total does each part make up?',
      ],
      'Distribution of one numeric variable → histogram or box plot. The other questions map to a bar chart, a line chart and a composition chart.',
    ),

    // ── Lesson 5 · Colour, labels and storytelling ──────────────────────────
    mcq(
      5,
      'Temperature anomaly data (above and below the historical average) has a meaningful zero. Which kind of palette suits it best?',
      'A diverging palette',
      ['A sequential palette', 'A categorical palette', 'A random palette'],
      'Diverging palettes put two contrasting hues on either side of a neutral midpoint, which makes "above" and "below" instantly readable.',
    ),
    mcq(
      5,
      'Which chart title is a headline title?',
      'CO2 Emissions Tripled Since 1970',
      ['CO2 Data', 'Value vs. Year', 'Chart 1'],
      'A headline title states the actual finding, whereas a generic or axis-restating title leaves the viewer to work out what matters.',
    ),
    mcq(
      5,
      'Why is a red-for-bad, green-for-good pairing risky on a dashboard?',
      'Roughly 8% of men have red-green colour blindness, so the two colours can look the same to them',
      [
        'Red and green cannot be shown on the same chart',
        'Green always looks darker than red',
        'Colour blindness only affects black-and-white printouts',
      ],
      'Colourblind-safe pairings such as blue/orange, or a perceptually uniform scale like viridis, keep the chart readable for everyone.',
    ),
    mcq(
      5,
      'A chart colours years from 2000 to 2024 with a rainbow categorical palette. What is wrong with that?',
      'It suggests the years are completely different groups, when neighbouring years are just slightly more or less',
      [
        'Matplotlib does not allow rainbow palettes',
        'Rainbow colours are always too bright',
        'Years cannot be shown with colour',
      ],
      'Ordered data needs an ordered (sequential) palette; a categorical palette implies false distinctness.',
    ),

    // ── Lesson 6 · Interactive charts with Plotly ───────────────────────────
    mcq(
      6,
      'What does an interactive Plotly chart let the viewer do that a static image cannot?',
      'Hover for exact values, zoom into a region and toggle series from the legend',
      [
        'Edit the underlying data file',
        'Change the Python code',
        'Turn the chart into a different chart type automatically',
      ],
      "Interactivity moves some of the exploring from the chart's creator to its viewer, which is powerful when you cannot predict every question.",
    ),
    mcq(
      6,
      'When Plotly Express builds a chart from a DataFrame, how should you say which column to use for x?',
      'Pass the column name as a string, such as `x="date"`',
      [
        'Pass the whole DataFrame as x',
        'Set x with `fig.show()`',
        'Rename the column to "x" first',
      ],
      'With the data_frame pattern, Plotly Express expects column names, not raw arrays.',
    ),
    mcq(
      6,
      'What does `fig.write_html("chart.html")` produce?',
      'A self-contained interactive chart that opens in any browser, with no Python or server needed',
      [
        'A PNG screenshot of the chart',
        'A copy of the DataFrame as a web page',
        'A Dash app that has to be started separately',
      ],
      'The HTML file embeds what it needs (the data, the layout and the Plotly library), so it can be shared easily.',
    ),
    mcq(
      6,
      'In Plotly, what is a "trace"?',
      'A single data series in a figure, such as one line or one set of bars',
      [
        'The title and axis settings of the page',
        'A saved copy of the chart',
        'An error message in the console',
      ],
      'A figure is made of one or more traces plus a layout (titles, axes, template).',
    ),

    // ── Lesson 7 · Dash dashboards ──────────────────────────────────────────
    mcq(
      7,
      'In a Dash app, what makes a callback run?',
      'A change to an Input component property, such as the value of a dropdown',
      [
        'The page being printed',
        'The `debug=True` setting',
        'A new row being added to the CSV file',
      ],
      'You describe what should happen when an input changes, and Dash calls the function and updates the output for you.',
    ),
    mcq(
      7,
      'What does a component need so that a callback can refer to it?',
      'A unique `id`',
      ['A CSS class', 'A title', 'A DataFrame of its own'],
      'Input and Output refer to components by id and property, for example Output("my-graph", "figure"). Forgetting the id causes a "component not found" error.',
    ),
    mcq(
      7,
      'A dashboard dropdown changes, but its chart always looks the same. The callback uses the full, unfiltered DataFrame. What is the fix?',
      'Filter the DataFrame to the selected value inside the callback before building the figure',
      [
        'Add a second dropdown',
        'Turn off `debug=True`',
        'Return a DataFrame instead of a figure',
      ],
      'The callback re-runs on every change, so it must use the new value to select the data it plots.',
    ),
    mcq(
      7,
      'What is the difference between `dash.html` and `dash.dcc`?',
      'html mirrors ordinary HTML tags such as Div, H1 and P; dcc supplies interactive widgets and graphs such as Dropdown, Slider and Graph',
      [
        'html is for charts and dcc is for text',
        'dcc is only used for styling',
        'They are two names for the same module',
      ],
      'The layout is a tree built from both: html for structure and text, dcc for the interactive parts.',
    ),

    // ── Lesson 8 · A complete dashboard ─────────────────────────────────────
    mcq(
      8,
      'What should you decide before writing any dashboard code?',
      'The one clear central question the dashboard will answer',
      [
        'As many charts as possible to include',
        'Which colours look the most exciting',
        'Where it will be shared online',
      ],
      'Picking one focused question, then 2–4 charts and 1–2 controls, keeps a dashboard understandable.',
    ),
    mcq(
      8,
      'A callback has one Input and three Outputs. How must it return its results?',
      'As a tuple of three values, in the same order the Outputs were declared',
      [
        'As a single DataFrame',
        'As three separate return statements',
        'In any order, because Dash matches them by type',
      ],
      'Dash assigns the returned values to the Outputs by position.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A pie chart is usually read more accurately than a bar chart, because the brain judges angles faster than it judges lengths.',
      false,
      'People are better at judging length and position than angle and area, which is why bar charts are usually clearer than pie charts.',
    ),
    tf(
      2,
      'In a Matplotlib scatter plot, the `c=` argument can colour each point by a third variable, with `plt.colorbar()` explaining the colours.',
      true,
      'Colour can encode a third variable, such as quiz score, as long as a colorbar or legend explains it.',
    ),
    tf(
      3,
      'A strong correlation shown in a heatmap proves that one variable causes the other.',
      false,
      'A heatmap shows how strongly variables move together, not why.',
    ),
    tf(
      4,
      'A pie chart with more than 3–4 slices, or with slices of similar size, is hard to read accurately.',
      true,
      'Humans are poor at comparing angles and areas, so similar slices are difficult to rank by eye.',
    ),
    tf(
      5,
      'You should annotate as many data points as possible, so that nothing important is missed.',
      false,
      'Too many annotations clutter the chart. Annotate only the one or two most important points.',
    ),
    tf(
      6,
      'A Plotly chart is interactive by default: hovering shows exact values and clicking a legend entry toggles that series on or off.',
      true,
      'That interactivity comes built in the moment the figure is rendered.',
    ),
    tf(
      7,
      'If a Dash callback updates the `figure` property of a `dcc.Graph`, it should return a Plotly figure object.',
      true,
      'Returning something else, such as a DataFrame, is a common mistake.',
    ),
    tf(
      8,
      'A KPI card is a small, prominent number on a dashboard that summarises a key figure.',
      true,
      'For example, a card might show the latest CO2 value or the percentage change since 2000.',
    ),
    tf(
      8,
      'A dashboard works best when it combines many unrelated questions on a single page.',
      false,
      'Cramming in unrelated questions makes a dashboard confusing. Choosing one focused question is a key skill.',
    ),
    tf(
      8,
      'Inspecting a real dataset with `.shape` and `.isnull().sum()` before charting it is unnecessary, because the charts will show any problem.',
      false,
      'Skipping inspection often leads to surprises later, such as missing or malformed values in the data.',
    ),
  ],
});

// Position 2 of the Data Scientist Final Test (Data Visualisation is not part of
// the Odyssey, so it has no stage or Odyssey share).
export const dataVisualisationExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'Why is a bar chart usually easier to read accurately than a pie chart?',
        'Bars rely on length and position, which people judge more accurately than angle and area',
        [
          'Bars always use fewer colours',
          'Pie charts cannot show percentages',
          'Bars are drawn with higher resolution',
        ],
        'Position along a common scale and length are the two most accurately perceived encodings.',
      ),
      mcq(
        1,
        'Why should 3D bars be avoided when the data only has two dimensions?',
        'The 3D perspective distorts the perceived size and position of the bars',
        [
          '3D charts cannot be saved as images',
          '3D bars always use too many colours',
          'Matplotlib does not support 3D',
        ],
        '3D effects add decoration and make values harder to compare, which lowers the data-ink ratio.',
      ),
      mcq(
        2,
        'A scatter plot colours each point by quiz score and adds `plt.colorbar()`. What is the colorbar for?',
        'It works like a legend, explaining what the colours mean',
        [
          'It draws a line of best fit',
          'It adds a title to the chart',
          'It saves the chart to disk',
        ],
        'When colour encodes a third variable, the viewer needs a key to read it.',
      ),
      mcq(
        3,
        'What does `kde=True` add to a Seaborn histogram?',
        'A smooth density curve laid over the bars',
        [
          'A separate box plot beneath the bars',
          'A column of correlation values',
          'A different colour for each bar',
        ],
        'KDE (kernel density estimate) shows the smooth shape of the distribution behind the binned bars.',
      ),
      mcq(
        4,
        'Why is a sorted horizontal bar chart often a good choice for categories with long names?',
        'The names fit along the side, and sorting lets readers see the rank order at a glance',
        [
          'Horizontal bars use less data',
          'Sorted bars show a trend over time',
          'It avoids the need for axis labels',
        ],
        'Horizontal bars leave room for long labels, and sorting by value saves the reader from hunting for the largest and smallest.',
      ),
      mcq(
        5,
        'Population by region is ordered numeric data that is always positive. Which palette suits it?',
        'A sequential palette, such as viridis or Blues',
        [
          'A diverging palette',
          'A categorical palette such as Set2',
          'A different random colour for each region',
        ],
        'Sequential palettes get darker or lighter as the value increases, so "more" reads as "more intense".',
      ),
      mcq(
        6,
        'How do Plotly Express and Plotly Graph Objects differ?',
        'Express builds common charts in one line; Graph Objects gives finer control over every trace and layout element',
        [
          'Express works only for line charts; Graph Objects works only for bar charts',
          'Express needs a server; Graph Objects does not',
          'Graph Objects is the older name for Plotly Express',
        ],
        'Start with Express for speed, and drop down to Graph Objects when you need precise control.',
      ),
      mcq(
        7,
        'What does `debug=True` do while a Dash app is being developed?',
        'It reloads the app automatically when you save changes to the code',
        [
          'It makes the app faster for visitors',
          'It hides all error messages',
          'It publishes the app to the internet',
        ],
        'Auto-reload speeds up development, but a syntax error will still stop the server until it is fixed.',
      ),
    ],
    trueFalse: [
      tf(
        5,
        'A headline chart title states the finding itself, for example "CO2 Emissions Tripled Since 1970".',
        true,
        'Headline titles tell the viewer what to notice; generic titles do not.',
      ),
      tf(
        6,
        'A Plotly hover tooltip works best when it shows every available column of the data.',
        false,
        'Too many hover fields overwhelm the tooltip. Keep to two to four relevant fields.',
      ),
    ],
  },
};
