function StatusModel () { }

_.extend(StatusModel.prototype, Backbone.Events);

StatusModel.prototype.setMissionCompletionRate = function (completionRate) {
    this.trigger("StatusFieldMissionProgressBar:setCompletionRate", completionRate);
};

StatusModel.prototype.setProgressBar = function (completionRate) {
    this.trigger("StatusFieldMissionProgressBar:setBar", completionRate);
};