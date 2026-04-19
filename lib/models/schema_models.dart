abstract class SakshamModel {
  Map<String, dynamic> toJson();
}

class User implements SakshamModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? district;
  final String? phone;
  final num? schoolId;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.district,
    this.phone,
    this.schoolId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'peon',
      district: json['district'],
      phone: json['phone'],
      schoolId: json['schoolId'],
    );
  }

  @override
  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
        if (district != null) 'district': district,
        if (phone != null) 'phone': phone,
        if (schoolId != null) 'schoolId': schoolId,
      };
}

class School implements SakshamModel {
  final String id;
  final num schoolId;
  final String name;
  final String district;
  final String? block;
  final String? schoolType;
  final bool? isGirlsSchool;
  final num? numStudents;
  final num? buildingAge;
  final String? materialType;
  final String? weatherZone;
  final num? lat;
  final num? lng;
  final bool isActive;

  School({
    required this.id,
    required this.schoolId,
    required this.name,
    required this.district,
    this.block,
    this.schoolType,
    this.isGirlsSchool,
    this.numStudents,
    this.buildingAge,
    this.materialType,
    this.weatherZone,
    this.lat,
    this.lng,
    this.isActive = true,
  });

  factory School.fromJson(Map<String, dynamic> json) {
    final infrastructure = json['infrastructure'] as Map<String, dynamic>? ?? {};
    final location = json['location'] as Map<String, dynamic>? ?? {};
    return School(
      id: json['_id'] ?? '',
      schoolId: json['schoolId'] ?? 0,
      name: json['name'] ?? '',
      district: json['district'] ?? '',
      block: json['block'],
      schoolType: json['schoolType'],
      isGirlsSchool: json['isGirlsSchool'],
      numStudents: json['numStudents'],
      buildingAge: infrastructure['buildingAge'],
      materialType: infrastructure['materialType'],
      weatherZone: infrastructure['weatherZone'],
      lat: location['lat'],
      lng: location['lng'],
      isActive: json['isActive'] ?? true,
    );
  }

  @override
  Map<String, dynamic> toJson() => {
        '_id': id,
        'schoolId': schoolId,
        'name': name,
        'district': district,
        'block': block,
        'schoolType': schoolType,
        'isGirlsSchool': isGirlsSchool,
        'numStudents': numStudents,
        'infrastructure': {
          'buildingAge': buildingAge,
          'materialType': materialType,
          'weatherZone': weatherZone,
        },
        'location': {
          'lat': lat,
          'lng': lng,
        },
        'isActive': isActive,
      };
}

class WorkOrder implements SakshamModel {
  final String id;
  final String? decisionId;
  final num schoolId;
  final String district;
  final String category;
  final String? assignedTo;
  final String? assignedBy;
  final num priorityScore;
  final String status;
  final DateTime deadline;
  final DateTime? startedAt;
  final DateTime? completedAt;

  WorkOrder({
    required this.id,
    this.decisionId,
    required this.schoolId,
    required this.district,
    required this.category,
    this.assignedTo,
    this.assignedBy,
    required this.priorityScore,
    required this.status,
    required this.deadline,
    this.startedAt,
    this.completedAt,
  });

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    final assignment = json['assignment'] ?? {};
    return WorkOrder(
      id: json['_id'] ?? '',
      decisionId: json['decisionId']?.toString(),
      schoolId: json['schoolId'] ?? 0,
      district: json['district'] ?? '',
      category: json['category'] ?? '',
      assignedTo: assignment['assignedTo']?.toString(),
      assignedBy: assignment['assignedBy']?.toString(),
      priorityScore: json['priorityScore'] ?? 0,
      status: json['status'] ?? 'pending',
      deadline: DateTime.tryParse(json['deadline'] ?? '') ?? DateTime.now(),
      startedAt: json['startedAt'] != null ? DateTime.tryParse(json['startedAt']) : null,
      completedAt: json['completedAt'] != null ? DateTime.tryParse(json['completedAt']) : null,
    );
  }

  @override
  Map<String, dynamic> toJson() => {
        '_id': id,
        'decisionId': decisionId,
        'schoolId': schoolId,
        'district': district,
        'category': category,
        'assignment': {
          'assignedTo': assignedTo,
          'assignedBy': assignedBy,
        },
        'priorityScore': priorityScore,
        'status': status,
        'deadline': deadline.toIso8601String(),
        if (startedAt != null) 'startedAt': startedAt?.toIso8601String(),
        if (completedAt != null) 'completedAt': completedAt?.toIso8601String(),
      };
}

class ConditionReportItem {
  final String? category;
  final String? subCategory;
  final String? condition;
  final String? notes;

  ConditionReportItem({this.category, this.subCategory, this.condition, this.notes});

  factory ConditionReportItem.fromJson(Map<String, dynamic> json) => ConditionReportItem(
        category: json['category'],
        subCategory: json['subCategory'],
        condition: json['condition'],
        notes: json['notes'],
      );

  Map<String, dynamic> toJson() => {
        'category': category,
        'subCategory': subCategory,
        'condition': condition,
        'notes': notes,
      };
}

class ConditionReport implements SakshamModel {
  final String id;
  // Note: Conflict! In ConditionReport this is an ObjectId referring to School.
  // In other models (WorkOrder, Alert, User, SchoolConditionRecord), schoolId is a Number.
  // Storing as dynamic to allow safe parsing from MongoDB string or number representations.
  final dynamic schoolId;
  final String? submittedBy;
  final DateTime weekOf;
  final List<ConditionReportItem> items;
  final String? overallNotes;
  final num? riskScore;
  final String? riskLevel;

  ConditionReport({
    required this.id,
    required this.schoolId,
    this.submittedBy,
    required this.weekOf,
    required this.items,
    this.overallNotes,
    this.riskScore,
    this.riskLevel,
  });

  factory ConditionReport.fromJson(Map<String, dynamic> json) {
    var rawItems = json['items'] as List? ?? [];
    return ConditionReport(
      id: json['_id'] ?? '',
      schoolId: json['schoolId'],
      submittedBy: json['submittedBy']?.toString(),
      weekOf: DateTime.tryParse(json['weekOf'] ?? '') ?? DateTime.now(),
      items: rawItems.map((e) => ConditionReportItem.fromJson(e)).toList(),
      overallNotes: json['overallNotes'],
      riskScore: json['riskScore'],
      riskLevel: json['riskLevel'],
    );
  }

  @override
  Map<String, dynamic> toJson() => {
        '_id': id,
        'schoolId': schoolId,
        'submittedBy': submittedBy,
        'weekOf': weekOf.toIso8601String(),
        'items': items.map((e) => e.toJson()).toList(),
        'overallNotes': overallNotes,
        'riskScore': riskScore,
        'riskLevel': riskLevel,
      };
}

class Alert implements SakshamModel {
  final String id;
  final num schoolId;
  final String district;
  final String category;
  final String type;
  final String message;
  final bool isResolved;

  Alert({
    required this.id,
    required this.schoolId,
    required this.district,
    required this.category,
    required this.type,
    required this.message,
    this.isResolved = false,
  });

  factory Alert.fromJson(Map<String, dynamic> json) => Alert(
        id: json['_id'] ?? '',
        schoolId: json['schoolId'] ?? 0,
        district: json['district'] ?? '',
        category: json['category'] ?? '',
        type: json['type'] ?? '',
        message: json['message'] ?? '',
        isResolved: json['isResolved'] ?? false,
      );

  @override
  Map<String, dynamic> toJson() => {
        '_id': id,
        'schoolId': schoolId,
        'district': district,
        'category': category,
        'type': type,
        'message': message,
        'isResolved': isResolved,
      };
}

class SchoolConditionRecord implements SakshamModel {
  final String id;
  final num schoolId;
  final String? schoolRef;
  final String district;
  final num conditionScore;
  final String category;
  final num weekNumber;

  SchoolConditionRecord({
    required this.id,
    required this.schoolId,
    this.schoolRef,
    required this.district,
    required this.conditionScore,
    required this.category,
    required this.weekNumber,
  });

  factory SchoolConditionRecord.fromJson(Map<String, dynamic> json) => SchoolConditionRecord(
        id: json['_id'] ?? '',
        schoolId: json['schoolId'] ?? 0,
        schoolRef: json['schoolRef']?.toString(),
        district: json['district'] ?? '',
        conditionScore: json['conditionScore'] ?? 0,
        category: json['category'] ?? '',
        weekNumber: json['weekNumber'] ?? 0,
      );

  @override
  Map<String, dynamic> toJson() => {
        '_id': id,
        'schoolId': schoolId,
        'schoolRef': schoolRef,
        'district': district,
        'conditionScore': conditionScore,
        'category': category,
        'weekNumber': weekNumber,
      };
}
