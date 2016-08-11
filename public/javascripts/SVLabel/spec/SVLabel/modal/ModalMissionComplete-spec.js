describe("ModalMissionComplete", function () {
    var modal;
    var uiModalMissionComplete;
    var $uiModalMissionCompleteFixture;
    var missionContainerMock;
    var modalMissionCompleteMapMock;
    var taskContainerMock;
    var neighborhood;
    var mission;

    // Mocks
    function MissionMock () {
        this.properties = {
            coverage: null,
            label: null,
            distance: null,
            distanceFt: null,
            distanceMi: null,
            route: [],
            labelCount: null
        };
    }
    MissionMock.prototype.getProperty = function (key) {
        return this.properties[key];
    };
    MissionMock.prototype.getRoute = function () {
        return this.properties.route;
    }
    MissionMock.prototype.getLabelCount = function () {
        return this.properties.labelCount;
    }
    function NeighborhoodMock() {
        this.properties = {
            name: null,
            regionId: null,
            completedLineDistance: null,
            totalLineDistance: null
        };
    }
    NeighborhoodMock.prototype.getProperty = function (key) {
        return this.properties[key];
    };
    NeighborhoodMock.prototype.completedLineDistance = function (units) {
        return this.properties.completedLineDistance;
    };
    NeighborhoodMock.prototype.totalLineDistance = function (units) {
        return this.properties.totalLineDistance;
    }

    function TaskContainerMock(){
        this.properties = {
            completedTasks: [],
            totalLineDistanceInARegion: null
        };
    }
    TaskContainerMock.prototype.getCompletedTasks = function () {
        return this.properties.completedTasks;
    };
    TaskContainerMock.prototype.totalLineDistanceInARegion = function (regionId, units) {
        return this.properties.totalLineDistanceInARegion;
    };
    function MissionContainerMock(){
        this.properties = {
            completedMissions: []
        };
    }

    MissionContainerMock.prototype.getCompletedMissions = function (){
        return this.properties.completedMissions;
    }

    beforeEach(function () {
        $uiModalMissionCompleteFixture = $('<div id="modal-mission-complete-holder"> \
        <div id="modal-mission-complete-background" class="modal-background"></div> \
        <div id="modal-mission-complete-foreground" class="modal-foreground"> \
        <h1>Mission Complete! <span class="normal" id="modal-mission-complete-title"></span></h1> \
        <div class="row"> \
            <div class="mapbox col-sm-7"> \
                <div id="modal-mission-complete-map"></div> \
                <div id="map-legend"> \
                    <span><svg class="legend-label" width="15" height="10"><rect width="15" height="10" id="green-square"></svg> This Mission</span><br> \
                    <span><svg class="legend-label" width="15" height="10"><rect width="15" height="10" id="blue-square"></svg> Previous Missions</span> \
                </div> \
            </div> \
            <div class="col-sm-5"> \
                <p><span id="modal-mission-complete-message"></span></p> \
                <h3>Mission Labels</h3> \
                <table class="table"> \
                    <tr> \
                        <th class="width-50-percent">Curb Ramp</th> \
                        <td id="modal-mission-complete-curb-ramp-count" class="col-right"></td> \
                    </tr> \
                    <tr> \
                        <th>Missing Curb Ramp</th> \
                        <td id="modal-mission-complete-no-curb-ramp-count" class="col-right"></td> \
                    </tr> \
                    <tr> \
                        <th>Obstacle in Path</th> \
                        <td id="modal-mission-complete-obstacle-count" class="col-right"></td> \
                    </tr> \
                    <tr> \
                        <th>Surface Problem</th> \
                        <td id="modal-mission-complete-surface-problem-count" class="col-right"></td> \
                    </tr> \
                    <tr> \
                        <th>Other</th> \
                        <td id="modal-mission-complete-other-count" class="col-right"></td> \
                    </tr> \
                </table> \
                <h3>Neighborhood Progress</h3> \
                <div id="modal-mission-complete-complete-bar"></div> \
                <table class="table"> \
                <tr> \
                    <th>Audited in this mission</th> \
                    <td id="modal-mission-complete-mission-distance" class="col-right"></td> \
                </tr> \
                <tr> \
                    <th>Audited in this neighborhood</th> \
                    <td id="modal-mission-complete-total-audited-distance" class="col-right"></td> \
                </tr> \
                <tr> \
                    <th>Remaining in this neighborhood</th> \
                    <td id="modal-mission-complete-remaining-distance" class="col-right"></td> \
                </tr> \
            </table> \
            <button class="btn blue-btn" id="modal-mission-complete-close-button">Continue</button> \
            </div> \
        </div> \
        </div> \
        </div>');

        uiModalMissionComplete = {};
        uiModalMissionComplete.holder = $uiModalMissionCompleteFixture;
        uiModalMissionComplete.foreground = $uiModalMissionCompleteFixture.find("#modal-mission-complete-foreground");
        uiModalMissionComplete.background = $uiModalMissionCompleteFixture.find("#modal-mission-complete-background");
        uiModalMissionComplete.missionTitle = $uiModalMissionCompleteFixture.find("#modal-mission-complete-title");
        uiModalMissionComplete.message = $uiModalMissionCompleteFixture.find("#modal-mission-complete-message");
        uiModalMissionComplete.map = $uiModalMissionCompleteFixture.find("#modal-mission-complete-map");
        uiModalMissionComplete.completeBar = $uiModalMissionCompleteFixture.find("#modal-mission-complete-complete-bar");
        uiModalMissionComplete.closeButton = $uiModalMissionCompleteFixture.find("#modal-mission-complete-close-button");
        uiModalMissionComplete.totalAuditedDistance = $uiModalMissionCompleteFixture.find("#modal-mission-complete-total-audited-distance");
        uiModalMissionComplete.missionDistance = $uiModalMissionCompleteFixture.find("#modal-mission-complete-mission-distance");
        uiModalMissionComplete.remainingDistance = $uiModalMissionCompleteFixture.find("#modal-mission-complete-remaining-distance");
        uiModalMissionComplete.curbRampCount = $uiModalMissionCompleteFixture.find("#modal-mission-complete-curb-ramp-count");
        uiModalMissionComplete.noCurbRampCount = $uiModalMissionCompleteFixture.find("#modal-mission-complete-no-curb-ramp-count");
        uiModalMissionComplete.obstacleCount = $uiModalMissionCompleteFixture.find("#modal-mission-complete-obstacle-count");
        uiModalMissionComplete.surfaceProblemCount = $uiModalMissionCompleteFixture.find("#modal-mission-complete-surface-problem-count");
        uiModalMissionComplete.otherCount = $uiModalMissionCompleteFixture.find("#modal-mission-complete-other-count");
        this.uiModalMissionComplete = uiModalMissionComplete;

        modalMissionCompleteMapMock = {
            hide: function () {},
            show: function () {},
            update: function () {},
            updateStreetSegments: function (a, b) {}
        };
        taskContainerMock = new TaskContainerMock();
        missionContainerMock = new MissionContainerMock();
        modal = new ModalMissionComplete($, d3, L, missionContainerMock, taskContainerMock, modalMissionCompleteMapMock, uiModalMissionComplete, Backbone.Events);

        mission = new MissionMock();
        mission.properties.distanceMi = 0.7575;
        mission.properties.distance = 1219.2;
        mission.properties.distanceFt = 4000;
        mission.properties.coverage = 0.07575;
        mission.properties.auditDistanceFt = 2000;
        mission.properties.auditDistanceMi = 0.3788;
        mission.properties.auditDistance = 609;
        mission.properties.label = "distance-mission";
        neighborhood = new NeighborhoodMock();
        neighborhood.properties.name = "Test Neighborhood";

    });

    describe("`hide` method", function () {
        it("should hide a modal window", function () {
            modal.hide();
            expect(uiModalMissionComplete.holder.css('visibility')).toBe('hidden');
            expect(uiModalMissionComplete.foreground.css('visibility')).toBe('hidden');
            expect(uiModalMissionComplete.background.css('visibility')).toBe('hidden');

            modal.show(mission, neighborhood);
            expect(uiModalMissionComplete.holder.css('visibility')).toBe('visible');
            expect(uiModalMissionComplete.foreground.css('visibility')).toBe('visible');
            expect(uiModalMissionComplete.background.css('visibility')).toBe('visible');
        });
    });

    describe("`_updateMissionProgressStatistics` method", function () {
        it("should set the distance traveled in the current mission", function () {
            modal._updateMissionProgressStatistics(0.38, 0.76, 9.24, "miles");
            expect(uiModalMissionComplete.missionDistance.text()).toBe("0.4 miles");
        });

        it("should set the cumulative distance traveled in the current neighborhood", function () {
            modal._updateMissionProgressStatistics(0.38, 0.76, 9.24, "miles");
            expect(uiModalMissionComplete.totalAuditedDistance.text()).toBe("0.8 miles");
        });

        it("should set the remaining distance to audit in the current neighborhood", function () {
            modal._updateMissionProgressStatistics(0.38, 0.76, 9.24, "miles");
            expect(uiModalMissionComplete.remainingDistance.text()).toBe("9.2 miles");

            modal._updateMissionProgressStatistics(1.1, 10.1, -0.1, "miles");
            expect(uiModalMissionComplete.remainingDistance.text()).toBe("0.0 miles");
        });
    });

    describe("setMissionTitle method", function () {
        it("should change the text in the title html", function(){
            expect(uiModalMissionComplete.missionTitle.html()).toBe('');
            modal.setMissionTitle("Test Title");
            expect(uiModalMissionComplete.missionTitle.html()).toBe("Test Title");
            });
    });

    describe("_updateTheMissionCompleteMessage", function (){
        it("should randomly display a message", function (){
            expect(uiModalMissionComplete.message.html()).toBe('');
            modal._updateTheMissionCompleteMessage();
            // cant predict which message since it is random
            expect(uiModalMissionComplete.message.html()).not.toBe("");
        });
    });

    describe("_updateMissionLabelStatisitcs method ", function(){
        it("label counts should be empty initially", function(){
            modal.show();
            expect(uiModalMissionComplete.curbRampCount.html()).toBe('');
            expect(uiModalMissionComplete.noCurbRampCount.html()).toBe('');
            expect(uiModalMissionComplete.obstacleCount.html()).toBe('');
            expect(uiModalMissionComplete.surfaceProblemCount.html()).toBe('');
            expect(uiModalMissionComplete.otherCount.html()).toBe('');
            modal.hide();
        });
        it("should populate label counts", function () {
            var labelCounts = {
                "CurbRamp": '10',
                "NoCurbRamp": '3',
                "Obstacle": '1',
                "SurfaceProblem": '4',
                "Other": '2'
            };
            modal.show();
            // label counts when set explicitly
            modal._updateMissionLabelStatistics(labelCounts.CurbRamp, labelCounts.NoCurbRamp, labelCounts.Obstacle, labelCounts.SurfaceProblem, labelCounts.Other);
            expect(uiModalMissionComplete.curbRampCount.html()).toBe('10');
            expect(uiModalMissionComplete.noCurbRampCount.html()).toBe('3');
            expect(uiModalMissionComplete.obstacleCount.html()).toBe('1');
            expect(uiModalMissionComplete.surfaceProblemCount.html()).toBe('4');
            expect(uiModalMissionComplete.otherCount.html()).toBe('2');
            modal.hide();
        });   
    });

    describe("update method", function (){
        beforeEach( function () {
            modal.show();
            mission.properties.distanceMi = 0;
            neighborhood.properties.completedLineDistance = 0;
            neighborhood.properties.totalLineDistance = 0;
        });
        afterEach( function () {
            modal.hide();
        });
        it("should update mission distance statistics", function () {
            mission.properties.distanceMi = 0.1;
            neighborhood.properties.completedLineDistance = 0.3;
            neighborhood.properties.totalLineDistance = 0.7;
            modal.update(mission, neighborhood);
            expect(uiModalMissionComplete.totalAuditedDistance.html()).toBe('0.1 miles');
            expect(uiModalMissionComplete.missionDistance.html()).toBe('0.3 miles');
            expect(uiModalMissionComplete.remainingDistance.html()).toBe('0.4 miles');
        });
        it("should update label counts", function () {
            modal.update(mission, neighborhood);
            expect(uiModalMissionComplete.curbRampCount.html()).toBe('0');
            expect(uiModalMissionComplete.noCurbRampCount.html()).toBe('0');
            expect(uiModalMissionComplete.obstacleCount.html()).toBe('0');
            expect(uiModalMissionComplete.surfaceProblemCount.html()).toBe('0');
            expect(uiModalMissionComplete.otherCount.html()).toBe('0');

            mission.properties.labelCount = {
                "CurbRamp": '10',
                "NoCurbRamp": '3',
                "Obstacle": '1',
                "SurfaceProblem": '4',
                "Other": '2'
            };
            modal.update(mission, neighborhood);
            expect(uiModalMissionComplete.curbRampCount.html()).toBe('10');
            expect(uiModalMissionComplete.noCurbRampCount.html()).toBe('3');
            expect(uiModalMissionComplete.obstacleCount.html()).toBe('1');
            expect(uiModalMissionComplete.surfaceProblemCount.html()).toBe('4');
            expect(uiModalMissionComplete.otherCount.html()).toBe('2');
        });
        it("should set the mission title", function () {
            modal.update(mission, neighborhood);
            expect(uiModalMissionComplete.missionTitle.html()).toBe('Test Neighborhood');
        });
    });
    /*
    describe("_updateNeighborhoodProgressBarGraph method", function (){
         it("to display new and cummulative neighborhood progress", function () {
            modal.show();
            modal._updateNeighborhoodDistanceBarGraph(0.1, 0.1);
            expect(uiModalMissionComplete).not.toBe(null);
            var bar = uiModalMissionComplete.completeBar;
            var blueBar = $('#missionDist');
            var greenBar = $('#auditedDist');
            var barText = $('#barText');
            expect(blueBar.attr('width') == greenBar.attr('width')).toBe(true);
            expect(blueBar.attr('fill')).toBe('rgba(49,130,189,1)');
            expect(greenBar.attr('fill')).toBe('rgba(100,240,110,1)');
            expect(barText.html()).toBe('20%');
            modal._updateNeighborhoodDistanceBarGraph(0.2, 0.3);
            expect(barText.html()).toBe('50%');
            modal.hide();
        }); 
    }); */
});
