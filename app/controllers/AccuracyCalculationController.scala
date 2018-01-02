package controllers

import javax.inject.Inject

import com.mohiva.play.silhouette.api.{Environment, Silhouette}
import com.mohiva.play.silhouette.impl.authenticators.SessionAuthenticator
import controllers.headers.ProvidesHeader
import models.amt.AMTAssignmentTable.getTurkersWithAcceptedHITForCondition
import models.amt.AMTConditionTable.{getVolunteerIdByRouteId, getVolunteerLabelsByCondition}
import models.amt.{AMTAssignmentTable, AMTConditionTable}
import models.clustering_session.{ClusteringSessionTable, LabelToCluster}
import models.gt.GTLabelTable
import models.user.User
import play.api.Logger
import play.api.libs.json.{JsObject, Json}
import play.api.mvc.{Action, AnyContent}

import scala.sys.process._
import scala.concurrent.Future

class AccuracyCalculationController @Inject()(implicit val env: Environment[User, SessionAuthenticator])
  extends Silhouette[User, SessionAuthenticator] with ProvidesHeader {


  /** Pages */

  def index = UserAwareAction.async { implicit request =>
    Future.successful(Ok(views.html.accuracy("Project Sidewalk", request.identity)))
  }


  /** Gets */

  /**
    * Returns the set of street edges, plus GT, volunteer, & turker labels associated with every MTurk condition
    *
    * @return
    */
  def getAccuracyData(workerType: String, clusterNum: String) = UserAwareAction.async { implicit request =>
    val clustNum: Int = clusterNum.toInt


//    val gtLabels: List[JsObject] = GTLabelTable.all.map(_.toGeoJSON).toList
    var gtLabels = List[JsObject]()
    var streets = List[JsObject]()
    var labels = List[JsObject]()

    // get street data
    val routeIds: List[Int] = AMTConditionTable.getRouteIdsForAllConditions
    streets = routeIds.flatMap(ClusteringSessionTable.getStreetGeomForIRR(_).map(_.toJSON))

    // val conditionIds: List[Int] = AMTConditionTable.getAllConditionIds
    // query only got 4 turkers for following conditions: 80, 91, 121
    // query only got 0 turkers for following conditions: 138
    // following conditions have no volunteer labels: 123, 124, 127, 128, 135, 139
//     val conditionIds: List[Int] = (72 to 72).toList // one condition for testing
    // val conditionIds: List[Int] = List(72, 74, 98, 100, 122, 128) // a few conditions for testing
    val conditionIds: List[Int] = (70 to 140).toList.filterNot(
      List(71, 104, 105, 130, 94, 96, 139, 123, 124, 127, 128, 135, 139, 80, 91, 121, 138).contains(_))

    // get labels from both GT and turkers/volunteers
    for (conditionId <- conditionIds) {
      gtLabels = List.concat(gtLabels, GTLabelTable.selectGTLabelsByCondition(conditionId).map(_.toGeoJSON))
      labels = workerType match {
        case "turker" =>
          clustNum match {
            case 1 =>
              val turkerId: Option[String] = getTurkersWithAcceptedHITForCondition(conditionId).headOption
              List.concat(labels, AMTAssignmentTable.getTurkerLabelsForCondition(turkerId, conditionId).map(_.toJSON))
            case _ =>
              val clustSessionIds: List[Int] = runNonGTClusteringForRoutesInCondition(conditionId, clustNum)
              List.concat(labels, ClusteringSessionTable.getLabelsForAccuracy(clustSessionIds).map(_.toJSON))
          }
        case "volunteer" => List.concat(labels, getVolunteerLabelsByCondition(conditionId).map(_.toJSON))
        case _ => labels
      }
    }

    // output as geoJSON feature collections
    var finalJson = Json.obj(
      "gt_labels" -> Json.obj("type" -> "FeatureCollection", "features" -> gtLabels),
      "worker_labels" -> Json.obj("type" -> "FeatureCollection", "features" -> labels),
      "streets" -> Json.obj("type" -> "FeatureCollection", "features" -> streets)
    )

    Future.successful(Ok(finalJson))
  }

  /**
    * Returns set of street edges, GT labs, & clustered volunteer & turker labels associated w/ every MTurk condition.
    *
    * @return
    */
  def getAccuracyDataWithSinglePersonClustering(workerType: String, clusterNum: String, threshold: Option[Float]) = UserAwareAction.async { implicit request =>
    val clustNum: Int = clusterNum.toInt

    // Get street data
    val routeIds: List[Int] = AMTConditionTable.getRouteIdsForAllConditions
    val streets: List[JsObject] = routeIds.flatMap(ClusteringSessionTable.getStreetGeomForIRR(_).map(_.toJSON))

//         val conditionIds: List[Int] = (72 to 72).toList // one condition for testing
    //     val conditionIds: List[Int] = List(72, 74, 98, 100, 122, 128) // a few conditions for testing
    val conditionIds: List[Int] = (70 to 140).toList.filterNot(
      List(71, 104, 105, 130, 94, 96, 139, 123, 124, 127, 128, 135, 139, 80, 91, 121, 138).contains(_))

    val gtLabels: List[JsObject] = conditionIds.flatMap(GTLabelTable.selectGTLabelsByCondition(_).map(_.toGeoJSON))

    val labels: List[JsObject] = workerType match {
      case "turker" =>
        clustNum match {
          case 1 => // single turker: do single-user clustering
            conditionIds.flatMap { conditionId =>
              val clustSessionIds: List[(Int, Int)] = runSingleTurkerClusteringForRoutesInCondition(conditionId, clustNum, None)
              ClusteringSessionTable.getSingleClusteredTurkerLabelsForAccuracy(clustSessionIds.map(_._1)).map(_.toJSON)
            }
          case _ => // more than one turker: do single-user clustering on each, then cluster their clusters
            conditionIds.flatMap { conditionId =>
              val clustSessionIds: List[(Int, Int)] = runSingleTurkerClusteringForRoutesInCondition(conditionId, clustNum, None)
              val doubleClusteredSessions: List[Int] = clustSessionIds.groupBy(_._2).map {
                case (rId, lst) => runClustering("turker", singleUser = false, None, threshold, Some(rId), None, Some(lst.map(_._1)))
              }.toList
              ClusteringSessionTable.getClusteredLabelsForAccuracy(doubleClusteredSessions).map(_.toJSON)
            }
        }
      case "volunteer" => // singe volunteer: do single-user clustering
        conditionIds.flatMap { conditionId =>
          val clustSessionIds: List[(Int, Int)] = runSingleVolunteerClusteringForRoutesInCondition(conditionId)
          ClusteringSessionTable.getSingleClusteredVolunteerLabelsForAccuracy(clustSessionIds.map(_._1)).map(_.toJSON)
        }
      case _ => List[JsObject]()
    }

    // output as geoJSON feature collections
    var finalJson = Json.obj(
      "gt_labels" -> Json.obj("type" -> "FeatureCollection", "features" -> gtLabels),
      "worker_labels" -> Json.obj("type" -> "FeatureCollection", "features" -> labels),
      "streets" -> Json.obj("type" -> "FeatureCollection", "features" -> streets)
    )

    Future.successful(Ok(finalJson))
  }

  /**
    * Returns set of street edges, GT labs, & clustered labels for each turker associated w/ every MTurk condition.
    *
    * @return
    */
  def getAccuracyForEachTurker(threshold: Option[Float]) = UserAwareAction.async { implicit request =>

    // Get street data
    val routeIds: List[Int] = AMTConditionTable.getRouteIdsForAllConditions
    val streets: List[JsObject] = routeIds.flatMap(ClusteringSessionTable.getStreetGeomForIRR(_).map(_.toJSON))

//    val conditionIds: List[Int] = List(72, 74, 98, 100, 122, 128) // a few conditions for testing
//    val conditionIds: List[Int] = (72 to 72).toList // one condition for testing
    val conditionIds: List[Int] = (70 to 140).toList.filterNot(
      List(71, 104, 105, 130, 94, 96, 139, 123, 124, 127, 128, 135, 139, 80, 91, 121, 138).contains(_))

    val gtLabels: List[JsObject] = conditionIds.flatMap(GTLabelTable.selectGTLabelsByCondition(_).map(_.toGeoJSON))

    // Run single-user clustering for the first 5 turkers in every condition.
    val sessions: List[(Int, Int)] = conditionIds.flatMap { conditionId =>
      runSingleTurkerClusteringForRoutesInCondition(conditionId, 5, threshold)
    }

    // 5 turkers did each route, so split the clustering session ids into 5 groups, with 1 turker from each route going
    // in each group
    val groupedSessions: List[List[Int]] = (0 to 4).toList.map(n => sessions.groupBy(_._2).flatMap(_._2.map(_._1).lift(n)).toList)

    // output json as feature collection
    val finalJson = Json.arr(
      groupedSessions.map { sIds =>
        val labs: List[JsObject] = ClusteringSessionTable.getSingleClusteredTurkerLabelsForAccuracy(sIds).map(_.toJSON)
        Json.obj(
          "gt_labels" -> Json.obj("type" -> "FeatureCollection", "features" -> gtLabels),
          "worker_labels" -> Json.obj("type" -> "FeatureCollection", "features" -> labs),
          "streets" -> Json.obj("type" -> "FeatureCollection", "features" -> streets)
        )
      }
    )
    Future.successful(Ok(finalJson))
  }

  /**
    * Runs clustering on each route of specified condition for n Turkers' labs. Returns new clustering_session_ids used.
    *
    * @param conditionId
    * @param nTurkers
    * @return list of clustering session ids
    */
  def runNonGTClusteringForRoutesInCondition(conditionId: Int, nTurkers: Int): List[Int] = {

    AMTAssignmentTable.getTurkersWithAcceptedHITForCondition(conditionId) match {
      case Nil => List[Int]()
      case _ => AMTConditionTable.getRouteIdsForACondition(conditionId).map(routeId =>
        runClustering("turker", singleUser = false, None, None, Some(routeId), Some(nTurkers), None))
    }
  }

  /**
    * Returns the set of clusters associated with the given clustering sessions, in format needed to cluster again.
    *
    * @param sessionIdsStr
    * @return
    */
  def getClusteredTurkerLabelsToCluster(sessionIdsStr: String, routeId: Option[Int]): Action[AnyContent] = UserAwareAction.async { implicit request =>
    // parse list of session ids and possible list of route ids, in the form "num,num,num"
    val sessionIds: List[Int] = sessionIdsStr.split(",").map(_.toInt).toList

    val labsToCluster: List[LabelToCluster] = ClusteringSessionTable.getClusteredTurkerLabelsToCluster(sessionIds, routeId)
    val json = Json.arr(labsToCluster.map(x => Json.obj(
      "label_id" -> x.labelId,
      "turker_id" -> x.turkerId,
      "label_type" -> x.labelType,
      "lat" -> x.lat,
      "lng" -> x.lng,
      "severity" -> x.severity,
      "temporary" -> x.temp
    )))
    Future.successful(Ok(json))
  }

  /**
    * Runs the Python clustering script, passing along the correct arguments, given this function's parameters.
    *
    * @param volunteerOrTurker either "volunteer" or "turker"
    * @param singleUser determines whether we are clustering a single user's labels
    * @param id either turker id or user id
    * @param routeId
    * @param nTurkers only used for old version of clustering where individuals are not clustered first
    * @param sessionIds list of clustering session ids
    * @return
    */
  def runClustering(volunteerOrTurker: String,
                    singleUser: Boolean,
                    id: Option[String],
                    threshold: Option[Float],
                    routeId: Option[Int],
                    nTurkers: Option[Int],
                    sessionIds: Option[List[Int]]): Int = {

    val command: String = (volunteerOrTurker, singleUser, id, threshold, routeId, nTurkers, sessionIds) match {
      case ("volunteer", _, _, _, Some(route), _, _) =>
        "python label_clustering.py --user_id " + getVolunteerIdByRouteId(route) + " --route_id " + route
      case ("turker", true, Some(turkerId), Some(thresh), Some(route), _, _) =>
        "python label_clustering.py --turker_id " + turkerId + " --route_id " + route + " --clust_thresh " + thresh
      case ("turker", true, Some(turkerId), _, Some(route), _, _) =>
        "python label_clustering.py --turker_id " + turkerId + " --route_id " + route
      case ("turker", false, _, Some(thresh), Some(route), _, Some(sessions)) =>
        "python label_clustering.py --route_id " + route + " --session_ids " + sessions.mkString(" ") + " --clust_thresh " + thresh
      case ("turker", false, _, _, Some(route), _, Some(sessions)) =>
        "python label_clustering.py --route_id " + route + " --session_ids " + sessions.mkString(" ")
      case ("turker", false, _, _, None, _, Some(sessions)) =>
        "python label_clustering.py --session_ids " + sessions.mkString(" ")
      case ("turker", false, _, _, Some(route), Some(n), _) => // old version of clustering
        "python label_clustering.py --route_id " + route + " --n_labelers " + n
      case _ =>
        Logger.error("Incorrect parameters to Python script.")
        ""
    }

    // Run Python script, and get the clustering id that is created by the Python script.
    // TODO handle errors thrown by Python script
    val clusteringOutput: String = command.!!
    ClusteringSessionTable.getNewestClusteringSessionId
  }

  /**
    * Runs clustering on each route of the specified condition for a volunteer. Returns new clustering_session_ids.
    *
    * @param conditionId
    * @return list of clustering session ids w/ associated route id
    */
  def runSingleVolunteerClusteringForRoutesInCondition(conditionId: Int): List[(Int, Int)] = {

    val routes: List[Int] = AMTConditionTable.getRouteIdsForACondition(conditionId)
    routes.map(routeId => (runClustering("volunteer", singleUser = true, None, None, Some(routeId), None, None), routeId))
  }

  /**
    * Runs clustering on each route of the specified condition, for nTurkers. Returns new clustering_session_ids.
    *
    * @param conditionId
    * @param nTurkers
    * @return list of clustering session ids w/ associated route id
    */
  def runSingleTurkerClusteringForRoutesInCondition(conditionId: Int, nTurkers: Int, threshold: Option[Float]): List[(Int, Int)] = {

    val turkerIds: List[String] = AMTAssignmentTable.getTurkersWithAcceptedHITForCondition(conditionId).take(nTurkers)
    val routesToCluster: List[Int] = AMTConditionTable.getRouteIdsForACondition(conditionId)

    if (turkerIds.length != nTurkers) {
      Logger.warn(s"Trying to cluster $nTurkers turkers for condition $conditionId, but only ${turkerIds.length} have finished it.")
    }

    routesToCluster.flatMap(routeId =>
      turkerIds.map(turkerId =>
        (runClustering("turker", singleUser = true, Some(turkerId), threshold, Some(routeId), None, None), routeId)))
  }


  /** Posts */

}