describe("MissionProgress module", function () {
    var missionProgress;
    var svl;
    var gameEffectModel;
    var missionModel;
    var modalModel;
    var neighborhoodModel;
    var missionContainer;
    var neighborhoodContainer;
    var taskContainer;
    var mission;
    var neighborhood;

    beforeEach(function () {
        svl = {};
        gameEffectModel = _.clone(Backbone.Events);
        missionModel  = _.clone(Backbone.Events);
        modalModel = _.clone(Backbone.Events);
        neighborhoodModel = _.clone(Backbone.Events);
        missionContainer = new MissionContainerMock();
        neighborhoodContainer = new NeighborhoodContainerMock();
        taskContainer = new TaskContainerMock();

        modalModel.updateModalMissionComplete = function (mission, neighborhood) {
            this.trigger("ModalMissionComplete:update", { mission: mission, neighborhood: neighborhood });
        };

        modalModel.showModalMissionComplete = function () {
            this.trigger("ModalMissionComplete:show");
        };

        missionProgress = new MissionProgress(svl, gameEffectModel, missionModel, modalModel, neighborhoodModel,
            missionContainer, neighborhoodContainer, taskContainer);
    });

    describe("`_checkMissionComplete` method", function () {

        beforeEach(function () {
            spyOn(missionProgress, '_completeTheCurrentMission');
            spyOn(missionProgress, '_updateTheCurrentMission');
            spyOn(modalModel, 'updateModalMissionComplete');
            spyOn(modalModel, 'showModalMissionComplete');
            mission = new MissionMock();
            neighborhood = new NeighborhoodMock();
        });

        it("should call `_completeTheCurrentMission` if the mission is completed", function () {
            mission.getMissionCompletionRate = function () { return 0; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(missionProgress._completeTheCurrentMission).not.toHaveBeenCalled();

            mission.getMissionCompletionRate = function () { return 1.0; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(missionProgress._completeTheCurrentMission).toHaveBeenCalled();
        });

        it("should call `_updateTheCurrentMission` if the mission is completed", function () {
            mission.getMissionCompletionRate = function () { return 0; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(missionProgress._updateTheCurrentMission).not.toHaveBeenCalled();

            mission.getMissionCompletionRate = function () { return 1; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(missionProgress._updateTheCurrentMission).toHaveBeenCalled();
        });

        it("should call `ModalModel.updateModalMissionComplete` if the mission is completed", function () {
            mission.getMissionCompletionRate = function () { return 0; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(modalModel.updateModalMissionComplete).not.toHaveBeenCalled();

            mission.getMissionCompletionRate = function () { return 1; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(modalModel.updateModalMissionComplete).toHaveBeenCalled();
        });

        it("should call `ModalModel.showModalMissionComplete` if the mission is completed", function () {
            mission.getMissionCompletionRate = function () { return 0; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(modalModel.showModalMissionComplete).not.toHaveBeenCalled();

            mission.getMissionCompletionRate = function () { return 1; };
            missionProgress._checkMissionComplete(mission, neighborhood);
            expect(modalModel.showModalMissionComplete).toHaveBeenCalled();
        });
    });

    describe("`_updateTheCurrentMission` method", function () {
        beforeEach(function () {
            var m1 = new MissionMock();
            var m2 = new MissionMock();
            var m3 = new MissionMock();
            m1._properties.regionId = 1;
            m2._properties.regionId = 1;
            m3._properties.regionId = 1;

            var n1 = new NeighborhoodMock();
            var n2 = new NeighborhoodMock();
            n1._properties.regionId = 1;
            n2._properties.regionId = 2;

            neighborhoodContainer = new NeighborhoodContainerMock();
            neighborhoodContainer._neighborhoods = { 1: n1, 2: n2 };
            missionContainer = new MissionContainerMock();
            missionContainer._missionStoreByRegionId[1] = [m1, m2, m3];
            missionContainer._missionStoreByRegionId[2] = [];
            missionContainer.nextMission = function (regionId) {
                return this._missionStoreByRegionId[1][0];
            };


            missionProgress = new MissionProgress(svl, gameEffectModel, missionModel, modalModel, neighborhoodModel,
                missionContainer, neighborhoodContainer, taskContainer);

            spyOn(missionContainer, 'setCurrentMission');
            spyOn(missionProgress, '_updateTheCurrentNeighborhood');
            mission = new MissionMock();
            mission._properties.regionId = 1;
            neighborhood = new NeighborhoodMock();
            neighborhood._properties.regionId = 1;
        });

        it("should call `MissionContainer.setCurrentMission` to set the next mission", function () {
            missionProgress._updateTheCurrentMission(mission, neighborhood);
            expect(missionContainer.setCurrentMission).toHaveBeenCalled();
        });

        it("should call `_updateTheCurrentNeighborhood` if the updated mission has different neighborhood id from the previous mission", function () {
            mission = new MissionMock();
            mission._properties.regionId = 1;
            neighborhood = new NeighborhoodMock();
            neighborhood._properties.regionId = 1;
            missionProgress._updateTheCurrentMission(mission, neighborhood);
            expect(missionProgress._updateTheCurrentNeighborhood).not.toHaveBeenCalled();

            mission = new MissionMock();
            mission._properties.regionId = 2;
            neighborhood = new NeighborhoodMock();
            neighborhood._properties.regionId = 2;
            missionProgress._updateTheCurrentMission(mission, neighborhood);
            expect(missionProgress._updateTheCurrentNeighborhood).toHaveBeenCalled();
        });

        it("should fail when next mission is not avaialble", function () {
            missionContainer = new MissionContainerMock();
            missionContainer.nextMission = function (regionId) {
                return null;
            };
            missionProgress = new MissionProgress(svl, gameEffectModel, missionModel, modalModel, neighborhoodModel,
                missionContainer, neighborhoodContainer, taskContainer);

            expect(function () {
                missionProgress._updateTheCurrentMission(mission, neighborhood);
            }).toThrow(new Error("No missions available"));
        });
    });

    describe("`_updateTheCurrentNeighborhood` method", function () {
        beforeEach(function () {
            neighborhoodModel.moveToANewRegion = function (neighborhood) { };
            spyOn(neighborhoodContainer, 'setCurrentNeighborhood');
            spyOn(neighborhoodModel, 'moveToANewRegion');
            spyOn(taskContainer, 'fetchTasksInARegion');
        });

        it("should call `NeighborhoodContainer.setCurrentNeighborhood`", function () {
            missionProgress._updateTheCurrentNeighborhood(mission, neighborhood);
            expect(neighborhoodContainer.setCurrentNeighborhood).toHaveBeenCalled()
        });

        it("should call `NeighborhoodModel.moveToANewRegion`", function () {
            missionProgress._updateTheCurrentNeighborhood(mission, neighborhood);
            expect(neighborhoodModel.moveToANewRegion).toHaveBeenCalled();
        });

        it("should call `TaskContainer.fetchTasksInARegion`", function () {
            missionProgress._updateTheCurrentNeighborhood(mission, neighborhood);
            expect(taskContainer.fetchTasksInARegion).toHaveBeenCalled();
        });
    });

    describe("in response to events", function () {
        beforeEach(function () {

        });
    });

    function MissionMock () {
        this._properties = {
            missionId: null,
            coverrage: null,
            distance: null,
            distanceFt: null,
            distanceMi: null,
            auditDistance: null,
            auditDistanceFt: null,
            auditDistanceMi: null,
            label: null,
            regionId: null
        };
    }

    MissionMock.prototype.getProperty = function (key) {
        return this._properties[key];
    };

    MissionMock.prototype.setProperty = function (key, value) {
        this._properties[key] = value;
    };

    MissionMock.prototype.isCompleted = function () {
        return this.properties.isCompleted;
    };

    function MissionContainerMock () {
        this._missionStoreByRegionId = {};
        this._status = { currentMission: null };
        this.nextMission = function () { return new MissionMock(); };
        this.setCurrentMission = function (mission) { this._status.currentMission = mission; };
    }

    function NeighborhoodMock(regionId) {
        this._properties = {
            name: null,
            regionId: regionId ? regionId : null
        };
    }

    NeighborhoodMock.prototype.getProperty = function (key) {
        return this._properties[key];
    };

    function NeighborhoodContainerMock () {
        this.neighborhoods = {};
        this._status = { currentNeighborhood: new NeighborhoodMock(1) };
        this.get = function (id) { return new NeighborhoodMock(id); };
        this.setCurrentNeighborhood = function (neighborhood) {
            this._status.currentNeighborhood = neighborhood;
        };
    }

    function TaskContainerMock () {
        this.fetchTasksInARegion = function (neighborhoodId) {};
    }
});