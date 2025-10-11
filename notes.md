# Planning Session - 11 October 2025

## Abstract

The target audience for this application will be the amatuer Auto Enthusiast. The end user
should be able to log in to the site to explore automobiles.

There should be a home page to introduce the application and tools it provides.

There will be a linke to a 'Discover' page. (Think search page from the toy Transportation application)

The discover page will be clean and simple. It will consist of a vehicle picker component. This component
will present as a data table with filterable columns, a pagination control, a tool to select the number
of rows of the table to pressent. Just above the table will be a search input that will search all of
the columns and rows and then display only the rows with at least one cell containing a partial match.


Initial table may looks something like:

| [X] Manufacturer | [X] Model | Kind [sport | Utility | Industrial]  Year Introduced | Last Model Year produced |

The [X] represents columns that include a checkbox. The checkboxes should have the same behavior as those for the
Transportation site. Where Manufacturer in Autos corresponds to manufacturer in Trasnporation and Model corresponds
to state.


## Architecture

Assume there will be at least two different apis for this project. The first API will fetch data required
for the table/picker described above. The second api will fetch data needed to populate a Results table
based on the selections made.

## Technology

Use the same technology stack as used for the Transportaton application.

## Data availability

Do a deep search to see what public domain data sets exist for download. The data must be freely available
and not require logins/tokens to access.

List your findings below:


