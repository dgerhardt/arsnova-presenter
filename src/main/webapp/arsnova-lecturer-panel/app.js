define(
	[
		"dojo/ready",
	 	"dojo/on",
	 	"dojo/when",
	 	"dojo/dom",
	 	"dojo/dom-construct",
	 	"dojo/dom-style",
	 	"dijit/registry",
	 	"dijit/Dialog",
	 	"dijit/form/Button",
	 	"dijit/form/DropDownButton",
	 	"dojox/charting/Chart",
	 	"dojox/charting/themes/Claro",
	 	"dojox/charting/plot2d/Columns",
	 	"dojox/charting/axis2d/Default",
		"arsnova-api/auth",
		"arsnova-api/session",
		"arsnova-api/lecturerquestion"
	],
	function(ready, on, when, dom, domConstruct, domStyle, registry, Dialog, Button, DropDownButton, Chart, ChartTheme, Columns, AxisDefault, arsAuth, arsSession, arsLQuestion) {
		var
			answerChart = null,
			feedbackChart = null,
		
			startup = function() {
				console.log("-- startup --");
				
				arsAuth.init(function() {
					/* user is not logged in an can not be logged in automatically */
					ready(showLoginDialog);
				});
				ready(initUi);
			},
		
			initUi = function() {
				console.log("-- initUi --");
				
				new DropDownButton({
					label: "New",
					dropDown: registry.byId("newSessionDialog")
				}, "newSessionButton");
				
				var sessionSelect = registry.byId("sessionSelect");
				sessionSelect.maxHeight = 200;
				sessionSelect.onChange = function(value) {
					arsSession.setKey(value);
				};
				
				if (arsAuth.isLoggedIn()) {
					registry.byId("createSessionButton").onClick = submitCreateSessionForm;
					registry.byId("logoutButton").onClick = arsAuth.logout;
					arsSession.watchKey(onSessionKeyChange);
					arsLQuestion.watchId(onLQuestionIdChange);
					updateSessionListView(arsSession.getOwned());
				}
				
				initCharts();
				
				dom.byId("appContainer").style.visibility = "visible";
			},
			
			initCharts = function() {
				answerChart = new Chart("answerChart");
				answerChart.setTheme(ChartTheme);
				answerChart.addPlot("default", {
					type: Columns,
					gap: 3
				});
				answerChart.addAxis("y", {vertical: true, includeZero: true, minorTicks: false});
				answerChart.render();
				
				feedbackChart = new Chart("feedbackChart");
				feedbackChart.setTheme(ChartTheme);
				feedbackChart.addPlot("default", {
					type: Columns,
					gap: 3
				});
				answerChart.addAxis("y", {vertical: true, includeZero: true, minorTicks: false});
				feedbackChart.render();
			},
			
			showLoginDialog = function() {
				var services = arsAuth.getServices();
				ready(function() {
					for (var service in services) {
						var domButton = domConstruct.place("<button type='button'>" + service + "</button>", "loginServiceButtons");
						new Button({
							label: services[service].title,
							onClick: function(url) {
								/* a function has to be returned because of the closure */
								return function() {
									location.href = url + "&referer=" + encodeURIComponent(location.href);
								};
							}(services[service].url)
						}, domButton);
					}
					var dlg = registry.byId("loginDialog");
					dlg.onCancel = function() {
						console.debug("Cancel action is disabled");
					};
					domStyle.set(dlg.closeButtonNode, "display", "none");
					dlg.show();
				});
			},
			
			onSessionKeyChange = function(name, oldValue, value) {
				dom.byId("activeUserCount").innerHTML = arsSession.getActiveUserCount();
				arsLQuestion.setSessionKey(value);
				updateLQuestionListView(arsLQuestion.getAll());
			},
			
			onLQuestionIdChange = function(name, oldValue, value) {
				updateLQuestionAnswersView(arsLQuestion.get(), arsLQuestion.getAnswers());
			},
			
			updateSessionListView = function(sessions) {
				var sessionSelect = registry.byId("sessionSelect");
				sessions.forEach(function(session) {
					sessionSelect.addOption({
						label: session.shortName,
						value: session.keyword
					});
				});
			},
			
			updateLQuestionListView = function(questions) {
				var questionList = dom.byId("lecturerQuestionList");
				questionList.innerHTML = "";
				questions.forEach(function(question) {
					var questionNode = domConstruct.toDom("<p>" + question.subject + "</p>");
					on(questionNode, "click", function(event) {
						arsLQuestion.setId(question._id);
						registry.byId("lecturerTabs").selectChild(registry.byId("lecturerAnswersPanel"));
					});
					domConstruct.place(questionNode, questionList);
				});
			},
			
			updateLQuestionAnswersView = function(question, answers) {
				var labelReverseMapping = {};
				var labels = [];
				var values = [];
				
				/* transform the label and answer count data into arrays usable by dojox/charting */
				when(question, function(question) {
					question.possibleAnswers.forEach(function(possibleAnswer, i) {
						labelReverseMapping[possibleAnswer.text] = i;
						labels.push({value: i + 1, text: possibleAnswer.text});
						values[i] = 0;
					});
					
					when(answers, function(answers) {
						answers.forEach(function(answer) {
							values[labelReverseMapping[answer.answerText]] = answer.answerCount;
						}, values);
						
						answerChart.addAxis("x", {labels: labels, minorTicks: false});
						answerChart.addSeries("Answer count", values);
						answerChart.render();
					});
				});
			},
			
			submitCreateSessionForm = function() {
				var
					shortName = registry.byId("sessionNameField").value,
					description = registry.byId("sessionDescField").value
				;
				
				if (arsSession.createSession(shortName, description)) {
					registry.byId("newSessionDialog").close();
				};
			}
		;
	
		return {
			init: function() {
				console.log("-- init --");
				
				startup();
			}
		};
	}
);
