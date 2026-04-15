import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Calendar, Clock, User, IndianRupee, Filter, ShieldCheck, Navigation } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent } from "@/src/components/ui/card";
import { LocationAutocomplete } from "../components/LocationAutocomplete";
import { useRides } from "../contexts/RideContext";

export default function LongTrips() {
  const { rides } = useRides();
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState("");

  // Filter rides to only show those marked as long trips (distance > 100km)
  const longTrips = rides.filter(ride => ride.isLongTrip);

  const filteredTrips = longTrips.filter(ride => {
    const matchFrom = ride.from.toLowerCase().includes(searchFrom.toLowerCase());
    const matchTo = ride.to.toLowerCase().includes(searchTo.toLowerCase());
    const matchDate = searchDate ? ride.date === searchDate : true;
    return matchFrom && matchTo && matchDate;
  });

  return (
    <div className="space-y-8">
      <div className="bg-blue-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Long Distance Travel</h1>
          <p className="text-blue-100 text-lg mb-8">Find comfortable rides for journeys over 100km. Save money and travel together.</p>
          
          <div className="bg-white p-2 rounded-2xl flex flex-col md:flex-row gap-2 shadow-lg">
            <div className="flex-1 relative">
              <LocationAutocomplete 
                placeholder="Leaving from" 
                className="pl-10 border-0 bg-transparent text-gray-900 h-12 focus-visible:ring-0"
                value={searchFrom}
                onChange={(val) => setSearchFrom(val)}
                onSelect={(lat, lng, name) => setSearchFrom(name)}
                icon={<MapPin className="h-5 w-5 text-gray-400" />}
              />
            </div>
            <div className="hidden md:block w-px bg-gray-200 my-2"></div>
            <div className="flex-1 relative border-t md:border-t-0 border-gray-100">
              <LocationAutocomplete 
                placeholder="Going to" 
                className="pl-10 border-0 bg-transparent text-gray-900 h-12 focus-visible:ring-0"
                value={searchTo}
                onChange={(val) => setSearchTo(val)}
                onSelect={(lat, lng, name) => setSearchTo(name)}
                icon={<MapPin className="h-5 w-5 text-gray-400" />}
              />
            </div>
            <div className="hidden md:block w-px bg-gray-200 my-2"></div>
            <div className="flex-1 relative border-t md:border-t-0 border-gray-100">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input 
                type="date" 
                className="pl-10 border-0 bg-transparent text-gray-900 h-12 focus-visible:ring-0"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Available Long Trips</h2>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrips.length > 0 ? (
          filteredTrips.map((ride) => (
            <Link key={ride.id} to={`/ride/${ride.id}`} className="block group">
              <Card className="h-full hover:shadow-md transition-all duration-200 border-gray-200 group-hover:border-blue-300">
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                          <Calendar className="h-4 w-4" /> {ride.date}
                          <span className="text-gray-300">•</span>
                          <Clock className="h-4 w-4" /> {ride.time}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-blue-600 flex items-center">
                        <IndianRupee className="h-4 w-4 mr-0.5" />{ride.price}
                      </div>
                    </div>

                    <div className="relative pl-6 space-y-4 py-2">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-blue-600 bg-white"></div>
                        <p className="font-semibold text-gray-900">{ride.from}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-red-600 bg-white"></div>
                        <p className="font-semibold text-gray-900">{ride.to}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium w-fit">
                      <Navigation className="h-4 w-4" />
                      {ride.distance} km
                    </div>

                    <hr className="border-gray-100" />

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-gray-900">{ride.driver}</p>
                            {ride.verified && <ShieldCheck className="h-4 w-4 text-green-500" />}
                          </div>
                          <p className="text-xs text-gray-500">★ {ride.rating}</p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {ride.seats} seats
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No long trips found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search filters or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
