# Radiology_Coding_Website

# RadTicker

This is a productivity tracker for radiologists. It is formulated based on a sql database of CPT codes, with their descriptions and abbreviations, and wRVU units stored in a sql database. It is intended for multiple users to be able to log in and customize their interface. In addition, the tracked values should be persistent across devices and browser sessions until cleared by the user.

Index Page: 
  This is a login page for authentication by the database to allow for persistence across computers during the workday. The other pages require authentication by the database to be accesssed. Once logged in the user is moved to the Main Page.

Main Page: 
  The mainpage is a customizable GUI of the relevant CPT codes/abbreviations. It is organized into a grid of cells with rows and columns. Each procedure is a "card" that contains infromation about the specific procedure it represents. The card also displays a count of how many of those procedures have been read during a given shift and a button to increment up the number of procedures read by a value of 1 each time it is clicked. The user can  manually edit the number of cases read rather than increment it with a button if desired. There is a default set of procedures and default layout of what procedures are where in each column and row. The cards are able to be moved into different cells in different columns and rows by clicking and dragging. When moved to a new column, the procedures below where it is dropped are all moved down a cell, they are never moved to the left or right to make room. There is a default order that is specified in the database for where the cards are displayed. Each user initially is given the default order, but is able to drag and drop procedures to rearrange them. There is a "save order" button that preserves the preferred order in the database for each user. 
  Every time the user changes the number of times a case has been read, either be incrementing with the button or manually entering the number, A database table is updated with the relevant information required to store that information.
  At the top of the mainpage is a dashboard. The dashboard has fields where the user can specify the date and time of the shift start, the shift title, the shift type, the shift length and the user's goal wRVU/hour. This data is also stored in the database. The dashboard provides a running tally of all of the wRVU performed for the day and calculates the actual wRVU/hour. There is a display of how much time the user is ahead or behind the goal. There is also a display of the total number of cases read during the shift and the number of cases read for each modality. This dashboard is updated dynamically, with an update everytime a change is made in the number of cases read as well as an update every 1 minute even when no cases are read. There is an "end shift" button that clears all the values in the GUI. This button prompts a confirmation and a place where the user can confirm the shift start time, end time, and shift title. There is also a way to undo the "end shift" operation.

Selector page: 
  The list of procedures displayed on the mainpage is customizable via the procedure selector page. This is a list of all CPT codes in the CPT codes database, it includes a button to indicate whether or not to show that procedure on the main page. This action is recorded in the database and allows each user to customize the list of procedures they wish to be shown. There is a search and filter field at the top that allows the user to quickly find cases of interest. The procedures are marked as shown or not on the main page by default based on information in the database. If the user has not saved any changes for what procedures to show, then the default is applied.

History Page:
  This page shows a table that includes the shift date, shift title, shift type, shift length, wRVU performed and wRVU/hour performed for every historical shift. A new entry is created every time the "end shift" button is pressed. The date is taken the infomration stored in the database. There is an option to export to csv so the user has control of their data.

Graph Page:
  This page displays several graphs relating the user's history. This is mainly wRVU vs date. There are graphs for all shifts, call shifts and weekend shifts.

Styles:
  As the website is being used by radiologists in a relatively low light room, the style will reflect the requirement for reduced light output. As such the background, font and accent colors will not be bright. Font color will be such that contrast is preserved to reduce eye strain. The styles will be consistent across all pages. In addition, due to the large number of possible cases and a desire to minimize the amount of scrolling required, their will be a minimum of dead space on the page.

The working deployment for testing is replit. The database being used is supabase.
